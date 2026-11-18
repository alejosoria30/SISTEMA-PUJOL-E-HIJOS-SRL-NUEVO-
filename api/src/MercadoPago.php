<?php
final class MercadoPago {
    private $db;
    private $sql;
    private $cliente;
    public function __construct(PDO $db,Acceso $sql,ClienteMercadoPago $cliente) {
        $this->db=$db; $this->sql=$sql; $this->cliente=$cliente;
    }
    private function variable(string $nombre): string {
        $valor=getenv('PUJOL_MP_'.$nombre);
        if (!$valor) throw new DomainException('Falta configurar Mercado Pago en el servidor.');
        return $valor;
    }
    private function llave(): string {
        $llave=base64_decode($this->variable('LLAVE'),true);
        if (strlen((string)$llave)!==32) throw new DomainException('Revise la llave de cifrado de Mercado Pago.');
        return $llave;
    }
    private function guardar(array $datos): void {
        if (empty($datos['user_id']) || empty($datos['refresh_token']) || empty($datos['access_token'])) throw new DomainException('Autorización incompleta.');
        $nonce=random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cifrado=$nonce.sodium_crypto_secretbox(json_encode([$datos['access_token'],$datos['refresh_token']]),$nonce,$this->llave());
        $this->sql->consultar('INSERT INTO cuentas_mp(vendedorExterno,credencialesCifradas,expira,activa) VALUES(?,?,TIMESTAMPADD(SECOND,?,NOW()),1)
          ON DUPLICATE KEY UPDATE credencialesCifradas=VALUES(credencialesCifradas),expira=VALUES(expira),activa=1',[$datos['user_id'],$cifrado,(int)$datos['expires_in']]);
    }
    public function autorizar(int $usuario): string {
        $this->llave(); $this->variable('SECRET');
        $estado=bin2hex(random_bytes(32)); $verificador=bin2hex(random_bytes(32));
        $this->sql->consultar('INSERT INTO oauth_mp VALUES(?,?,?,NOW()+INTERVAL 10 MINUTE)',[hash('sha256',$estado,true),$usuario,$verificador]);
        return 'https://auth.mercadopago.com.ar/authorization?'.http_build_query(['client_id'=>$this->variable('CLIENT_ID'),
          'response_type'=>'code','platform_id'=>'mp','redirect_uri'=>$this->variable('REDIRECT_URI'),'state'=>$estado,
          'code_challenge_method'=>'S256','code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verificador,true)),'+/','-_'),'=')]);
    }
    public function vincular(array $params): void {
        $estado=hash('sha256',(string)($params['state']??''),true);
        $this->db->beginTransaction();
        $fila=$this->sql->consultar("SELECT o.* FROM oauth_mp o JOIN usuario u USING(idUsu) JOIN usuario_rol ur ON ur.idUsu=u.idUsu AND ur.idRol=1
          WHERE o.resumen=? AND o.expira>NOW() AND u.estadoUsu='Activo' FOR UPDATE",[$estado])->fetch();
        if (!$fila) throw new DomainException('Autorización vencida.');
        $this->sql->consultar('DELETE FROM oauth_mp WHERE resumen=?',[$estado]);
        $this->db->commit();
        $this->guardar($this->cliente->solicitar('/oauth/token',['grant_type'=>'authorization_code','client_id'=>$this->variable('CLIENT_ID'),
          'client_secret'=>$this->variable('SECRET'),'code'=>$params['code']??'','code_verifier'=>$fila['verificador'],'redirect_uri'=>$this->variable('REDIRECT_URI')]));
    }
    private function token(int $caja): string {
        $cuenta = $this->sql->consultar('SELECT idCuenta FROM cajas_mp WHERE idCaja=?',[$caja])->fetchColumn();
        return $this->tokenCuenta((int)$cuenta);
    }
    public function verificarCaja(int $cuenta, string $externa): void {
        $respuesta=$this->cliente->solicitar('/v2/pos?external_id='.rawurlencode($externa),null,$this->tokenCuenta($cuenta));
        $vendedor=$this->sql->consultar('SELECT vendedorExterno FROM cuentas_mp WHERE idCuenta=? AND activa=1',[$cuenta])->fetchColumn();
        foreach (($respuesta['data']??[]) as $pos) {
            if (($pos['external_id']??null)===$externa && (string)($pos['user_id']??'')===(string)$vendedor
                && ($pos['status']??'')==='active' && !empty($pos['qr_response']['qr_code'])) return;
        }
        throw new DomainException('La cuenta vinculada no informó una caja QR activa con ese identificador.');
    }
    private function tokenCuenta(int $cuenta): string {
        $this->db->beginTransaction();
        try {
            $fila=$this->sql->consultar('SELECT c.*, c.expira<NOW()+INTERVAL 5 MINUTE renovar FROM cuentas_mp c WHERE c.idCuenta=? AND c.activa=1 FOR UPDATE',[$cuenta])->fetch();
            if (!$fila) throw new DomainException('La cuenta de esta caja está desvinculada.');
            $valor=$fila['credencialesCifradas']; $n=SODIUM_CRYPTO_SECRETBOX_NONCEBYTES;
            $claro=sodium_crypto_secretbox_open(substr($valor,$n),substr($valor,0,$n),$this->llave());
            if ($claro===false) throw new RuntimeException('Credencial ilegible.');
            [$token,$refresh]=json_decode($claro,true);
            if ($fila['renovar']) {
                $datos=$this->cliente->solicitar('/oauth/token',['grant_type'=>'refresh_token','client_id'=>$this->variable('CLIENT_ID'),'client_secret'=>$this->variable('SECRET'),'refresh_token'=>$refresh]);
                if ((string)$datos['user_id']!==$fila['vendedorExterno']) throw new DomainException('La cuenta no coincide.');
                $this->guardar($datos); $token=$datos['access_token'];
            }
            $this->db->commit(); return $token;
        } catch(Throwable $e) { $this->db->rollBack(); throw $e; }
    }
    public function iniciar(int $usuario,array $p): array {
        $clave=$p['claveOperacion']??'';
        if (!preg_match('/^[a-f0-9-]{36}$/D',$clave)) throw new DomainException('Identificador inválido.');
        $caja=(int)($p['idCaja']??0);
        // Compatible con el POS anterior que no enviaba tipoVenta.
        $tipoVenta=(string)($p['tipoVenta']??'mayorista');
        if (!in_array($tipoVenta,['mayorista','minorista'],true))
            throw new DomainException('Modalidad de venta inválida.');
        $items=[];
        foreach (($p['details']??[]) as $d) {
            $id=(int)$d['productId']; $cant=(string)$d['quantity'];
            if (!$id || isset($items[$id]) || !preg_match('/^[0-9]{1,8}(\.[0-9]{1,3})?$/D',$cant) || (float)$cant<=0) throw new DomainException('Cantidad inválida.');
            $items[$id]=number_format((float)$cant,3,'.','');
        }
        if (!$items) throw new DomainException('Carrito vacío.');
        ksort($items); $huella=hash('sha256',json_encode([$caja,$tipoVenta,$items],JSON_THROW_ON_ERROR));
        $huellaAnterior=hash('sha256',json_encode([$caja,$items],JSON_THROW_ON_ERROR));
        $this->db->beginTransaction();
        try {
            $pos=$this->sql->consultar('SELECT k.* FROM cajas_mp k JOIN cuentas_mp c USING(idCuenta) WHERE idCaja=? AND k.activa=1 AND c.activa=1 FOR UPDATE',[$caja])->fetch();
            if (!$pos) throw new DomainException('Seleccione una caja vinculada.');
            $orden=$this->sql->consultar('SELECT c.*,o.ordenExterna FROM cobros_pos c LEFT JOIN ordenes_mp o USING(idCobro) WHERE claveOperacion=? FOR UPDATE',[$clave])->fetch();
            // Permite conciliar un QR mayorista que estuviera pendiente antes de la migración 05.
            $heredada=$orden && $orden['tipoVenta']===null && $tipoVenta==='mayorista'
                && hash_equals($orden['huellaSolicitud'],$huellaAnterior);
            if ($orden && ((int)$orden['idUsu']!==$usuario ||
                (!hash_equals($orden['huellaSolicitud'],$huella) && !$heredada) ||
                ($orden['tipoVenta']!==null && $orden['tipoVenta']!==$tipoVenta)))
                throw new DomainException('La clave corresponde a otro carrito o modalidad.');
            if (!$orden) {
                if ($this->sql->consultar("SELECT 1 FROM ordenes_mp o JOIN cobros_pos c USING(idCobro) WHERE idCaja=? AND estado='pendiente'",[$caja])->fetchColumn()) throw new DomainException('Esta caja tiene un QR pendiente.');
                $turno=$this->sql->consultar("SELECT idTurno FROM caja_turnos WHERE estadoTurno='Abierto' ORDER BY idTurno LIMIT 1 FOR UPDATE")->fetchColumn();
                if (!$turno) throw new DomainException('Abra un turno antes de cobrar.');
                $lineas=[]; $centavos=0;
                foreach ($items as $id=>$cant) {
                    $prod=$this->sql->consultar("SELECT nombreProd,minimoMayorista,precioUnitario,precioMinorista,unidadMedida,
                      ROUND((CASE WHEN ?='minorista' THEN precioMinorista ELSE precioUnitario END)*CAST(? AS DECIMAL(14,3))*100) centavos
                      FROM productos JOIN inventario USING(idProd) WHERE idProd=? AND estadoProd='Activo' AND stockActual>=? FOR UPDATE",[$tipoVenta,$cant,$id,$cant])->fetch();
                    $precio=$prod ? ($tipoVenta==='minorista' ? $prod['precioMinorista'] : $prod['precioUnitario']) : null;
                    if (!$prod || $precio===null || (float)$precio<=0 || (int)$prod['centavos']<=0 ||
                        (in_array($prod['unidadMedida'],['unidad','caja','paquete']) && (float)$cant!=floor((float)$cant)))
                        throw new DomainException('Stock, cantidad o precio '.$tipoVenta.' inválidos.');
                    ReglaMayorista::verificar($tipoVenta, $cant, $prod);
                    $lineas[]=[$id,$cant,$precio]; $centavos+=(int)$prod['centavos'];
                    $this->sql->consultar('UPDATE inventario SET stockActual=stockActual-? WHERE idProd=?',[$cant,$id]);
                }
                $importe=number_format($centavos/100,2,'.','');
                $this->sql->consultar("INSERT INTO cobros_pos(claveOperacion,huellaSolicitud,idUsu,idTurno,medio,importe,tipoVenta) VALUES(?,?,?,?,'mercado_pago',?,?)",[$clave,$huella,$usuario,$turno,$importe,$tipoVenta]);
                $idCobro=(int)$this->db->lastInsertId();
                foreach ($lineas as $l) $this->sql->consultar('INSERT INTO reservas_pos(idCobro,idProd,cantidad,precioUnitario) VALUES(?,?,?,?)',array_merge([$idCobro],$l));
                $this->sql->consultar('INSERT INTO ordenes_mp(idCobro,idCaja) VALUES(?,?)',[$idCobro,$caja]);
            } else { $idCobro=(int)$orden['idCobro']; $importe=$orden['importe']; }
            $this->db->commit();
        } catch(Throwable $e) { $this->db->rollBack(); throw $e; }
        if (empty($orden['ordenExterna']) && (!$orden || $orden['estado']==='pendiente')) {
            try {
            $r=$this->cliente->solicitar('/v1/orders',['type'=>'qr','total_amount'=>$importe,'external_reference'=>$clave,'description'=>'Venta presencial '.$idCobro,
              'transactions'=>['payments'=>[['amount'=>$importe]]],'config'=>['qr'=>['external_pos_id'=>$pos['externalPosId'],'mode'=>'static']]],$this->token($caja),$clave);
            } catch (OrdenInvalida $e) {
                $this->db->beginTransaction();
                try {
                    $vigente=$this->sql->consultar('SELECT estado FROM cobros_pos WHERE idCobro=? FOR UPDATE',[$idCobro])->fetchColumn();
                    if ($vigente==='pendiente') {
                        $this->sql->consultar("UPDATE inventario i JOIN reservas_pos r USING(idProd) SET i.stockActual=i.stockActual+r.cantidad WHERE r.idCobro=? AND r.estado='reservada'",[$idCobro]);
                        $this->sql->consultar("UPDATE reservas_pos SET estado='liberada' WHERE idCobro=?",[$idCobro]);
                        $this->sql->consultar("UPDATE cobros_pos SET estado='rechazado' WHERE idCobro=?",[$idCobro]);
                        $this->sql->consultar("UPDATE ordenes_mp SET detalleEstado='orden_invalida',ultimaVerificacion=NOW() WHERE idCobro=?",[$idCobro]);
                    }
                    $this->db->commit();
                } catch (Throwable $fallo) { $this->db->rollBack(); throw $fallo; }
                return ['idCobro'=>$idCobro,'estado'=>'rechazado'];
            }
            if (empty($r['id'])) throw new DomainException('Orden pendiente de conciliación.');
            $this->sql->consultar('UPDATE ordenes_mp SET ordenExterna=? WHERE idCobro=?',[$r['id'],$idCobro]);
        }
        return ['idCobro'=>$idCobro,'estado'=>$orden['estado']??'pendiente'];
    }
    public function verificar(string $externa): array {
        $o=$this->sql->consultar('SELECT o.idCobro,o.idCaja,k.externalPosId,c.vendedorExterno FROM ordenes_mp o JOIN cajas_mp k USING(idCaja) JOIN cuentas_mp c USING(idCuenta) WHERE ordenExterna=?',[$externa])->fetch();
        if (!$o) throw new DomainException('Orden desconocida.');
        $r=$this->cliente->solicitar('/v1/orders/'.rawurlencode($externa),null,$this->token($o['idCaja']));
        $this->db->beginTransaction();
        try {
            $c=$this->sql->consultar('SELECT * FROM cobros_pos WHERE idCobro=? FOR UPDATE',[$o['idCobro']])->fetch();
            if (($r['id']??'')!==$externa || ($r['external_reference']??'')!==$c['claveOperacion'] || !is_numeric($r['total_amount']??null) || (float)$r['total_amount']!=(float)$c['importe'] || ($r['currency']??'')!=='ARS' || (string)($r['user_id']??'')!==$o['vendedorExterno'] || ($r['config']['qr']['external_pos_id']??'')!==$o['externalPosId']) throw new DomainException('La orden requiere conciliación manual.');
            $estado=$r['status']??''; $pago=$r['transactions']['payments'][0]??[];
            $id=$c['idCobro']; $nuevo=$c['estado']; $venta=$c['idVenta'];
            $acreditada=($estado==='processed' && ($pago['status']??'')==='processed' && in_array($pago['status_detail']??'',['accredited','partially_refunded'],true));
            $devuelta=($estado==='refunded' && ($pago['status']??'')==='refunded');
            if (($acreditada || $devuelta) && $nuevo==='pendiente' && !empty($pago['id']) && (float)($pago['amount']??0)==(float)$c['importe']) {
                $this->sql->consultar("INSERT INTO ventas(totalVenta,idUsu,estadoVenta,tipoVenta) VALUES(?,?,'Completada',?)",[$c['importe'],$c['idUsu'],$c['tipoVenta']??'mayorista']);
                $venta=$this->db->lastInsertId();
                $this->sql->consultar('INSERT INTO detalle_venta(idVenta,idProd,cantidad,precioUnitario,subtotal) SELECT ?,idProd,cantidad,precioUnitario,ROUND(cantidad*precioUnitario,2) FROM reservas_pos WHERE idCobro=?',[$venta,$id]);
                $this->sql->consultar("INSERT INTO movimientos_stock(idProd,tipoMovimiento,cantidad,idUsu,observaciones) SELECT idProd,'Salida',cantidad,?,? FROM reservas_pos WHERE idCobro=?",[$c['idUsu'],'Venta QR #'.$venta,$id]);
                $this->sql->consultar("UPDATE reservas_pos SET estado='consumida' WHERE idCobro=?",[$id]);
                $nuevo='aprobado';
            } elseif (in_array($estado,['expired','canceled','failed'],true) && $nuevo==='pendiente') {
                $this->sql->consultar("UPDATE inventario i JOIN reservas_pos r USING(idProd) SET i.stockActual=i.stockActual+r.cantidad WHERE r.idCobro=? AND r.estado='reservada'",[$id]);
                $this->sql->consultar("UPDATE reservas_pos SET estado='liberada' WHERE idCobro=?",[$id]);
                $nuevo=$estado==='failed'?'rechazado':'cancelado';
            }
            if ($devuelta && $nuevo==='aprobado') $nuevo='reembolsado';
            foreach (($r['transactions']['refunds']??[]) as $reembolso) {
                if (($reembolso['status']??'')==='processed' && !empty($reembolso['id']) && ($reembolso['transaction_id']??null)===($pago['id']??'') && (float)($reembolso['amount']??0)>0)
                    $this->sql->consultar('INSERT INTO reembolsos_mp(referencia,idCobro,importe,verificado) VALUES(?,?,?,NOW()) ON DUPLICATE KEY UPDATE verificado=NOW()',[$reembolso['id'],$id,$reembolso['amount']]);
            }
            $this->sql->consultar("UPDATE cobros_pos SET fechaAcreditacion=IF(estado='pendiente' AND ? IN ('aprobado','reembolsado'),CURRENT_TIMESTAMP,fechaAcreditacion),estado=?,idVenta=? WHERE idCobro=?",[$nuevo,$nuevo,$venta,$id]);
            $this->sql->consultar('UPDATE ordenes_mp SET pagoExterno=?,estadoProveedor=?,detalleEstado=?,ultimaVerificacion=NOW() WHERE idCobro=?',[$pago['id']??null,$estado,$r['status_detail']??null,$id]);
            $this->db->commit(); return ['estado'=>$nuevo,'idVenta'=>$venta];
        } catch(Throwable $e) { $this->db->rollBack(); throw $e; }
    }
}
