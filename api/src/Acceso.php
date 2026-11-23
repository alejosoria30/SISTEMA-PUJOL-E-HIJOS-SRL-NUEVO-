<?php
final class Acceso {
    private $db;
    public function __construct(PDO $db) { $this->db=$db; }
    public function consultar(string $sql, array $params=[]): PDOStatement {
        $q=$this->db->prepare($sql); $q->execute($params); return $q;
    }
    public function ingresar(array $datos): void {
        $identidad=trim((string)($datos['email']??''));
        $clave=(string)($datos['password']??'');
        foreach (['ip:'.($_SERVER['REMOTE_ADDR']??''),'cuenta:'.strtolower($identidad)] as $indice) {
            $llave=hash('sha256',$indice,true);
            $this->consultar("INSERT INTO intentos_acceso_pos VALUES (?,NOW(),1) ON DUPLICATE KEY UPDATE
                cantidad=IF(inicioVentana<NOW()-INTERVAL 10 MINUTE,1,cantidad+1),
                inicioVentana=IF(cantidad=1,NOW(),inicioVentana)",[$llave]);
            $intentos=$this->consultar('SELECT cantidad FROM intentos_acceso_pos WHERE clave=?',[$llave])->fetchColumn();
            if ($intentos>($indice[0]==='i'?90:12)) send_response(['message'=>'Espere diez minutos.'],429);
        }
        $this->db->beginTransaction();
        $u=$this->consultar("SELECT * FROM usuario WHERE (usuarioUsu=? OR correoUsu=?) AND estadoUsu='Activo' FOR UPDATE",[$identidad,$identidad])->fetch();
        if (!$u || $u['rolUsu']==='Cliente' || !password_verify($clave,$u['contrasenaUsu']) || !$this->roles($u['idUsu'])) {
            $this->db->rollBack(); send_response(['message'=>'Credenciales incorrectas.'],401);
        }
        $esAdministrador=in_array(1,$this->roles($u['idUsu']),true);
        $portal=$datos['acceso']??null;
        if (($portal==='administrador' && !$esAdministrador) || ($portal==='empleado' && $esAdministrador)) {
            $this->db->rollBack(); send_response(['message'=>'Utilice el acceso correspondiente a su perfil.'],403);
        }
        if ($u['requiereCambioClave']) {
            $nueva=$datos['claveNueva']??'';
            if (!is_string($nueva)||strlen($nueva)<12||$nueva===$clave) {
                $this->db->rollBack(); send_response(['message'=>'Ingrese una nueva contraseña de al menos 12 caracteres.','cambio'=>true],409);
            }
            $this->consultar('UPDATE usuario SET contrasenaUsu=?,requiereCambioClave=0 WHERE idUsu=?',[Claves::generar($nueva),$u['idUsu']]);
            $this->consultar('DELETE FROM sesiones_pos WHERE idUsu=?',[$u['idUsu']]);
        }
        $token=bin2hex(random_bytes(32));
        $this->consultar('INSERT INTO sesiones_pos VALUES (?, ?, NOW()+INTERVAL 1 HOUR)',[hash('sha256',$token,true),$u['idUsu']]);
        $this->consultar('DELETE FROM intentos_acceso_pos WHERE clave=?',[hash('sha256','cuenta:'.strtolower($identidad),true)]);
        $this->db->commit();
        send_response(['authToken'=>$token,'expiresIn'=>date('c',time()+3600)]);
    }
    public function roles(int $id): array {
        return array_map('intval',$this->consultar("SELECT r.idRol FROM roles r JOIN usuario_rol ur ON ur.idRol=r.idRol
          WHERE ur.idUsu=? AND r.idRol<>3 AND r.nombreRol <> 'Cliente'",[$id])->fetchAll(PDO::FETCH_COLUMN));
    }
    public function usuario(): array {
        $cabecera=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'';
        if (!preg_match('/^Bearer ([a-f0-9]{64})$/D',$cabecera,$m)) send_response(['message'=>'Inicie sesión.'],401);
        $u=$this->consultar("SELECT u.idUsu,u.nombreUsu,u.apellidoUsu,u.usuarioUsu,u.correoUsu,u.telefonoUsu FROM sesiones_pos s
          JOIN usuario u ON u.idUsu=s.idUsu WHERE resumenToken=? AND expira>NOW() AND estadoUsu='Activo' AND u.rolUsu<>'Cliente' AND requiereCambioClave=0",[hash('sha256',$m[1],true)])->fetch();
        if (!$u || !($u['roles']=$this->roles($u['idUsu']))) send_response(['message'=>'Sesión vencida.'],401);
        $u['resumen']=hash('sha256',$m[1],true);
        return $u;
    }
    public function permisos(int $id): array {
        $lista=$this->consultar("SELECT p.idDashPer,p.nombreDashPer,MAX(COALESCE(rp.puede_ver,0)) visualizar,
          MAX(COALESCE(rp.puede_crear,0)) crear,MAX(COALESCE(rp.puede_modificar,0)) modificar,
          MAX(COALESCE(rp.puede_eliminar,0)) anular FROM dashboard_permisos p
          LEFT JOIN rol_permiso rp ON p.idDashPer=rp.idDashPer AND rp.idRol IN
          (SELECT idRol FROM usuario_rol WHERE idUsu=?) GROUP BY p.idDashPer,p.nombreDashPer",[$id])->fetchAll();
        // Los permisos efectivos proceden EXCLUSIVAMENTE de los perfiles (rol_permiso).
        // La tabla antigua usuario_permiso_accion se conserva para auditoría/reversión,
        // pero las excepciones individuales ya no conceden ni deniegan acceso.
        $resultado=[];
        foreach ($lista as $permiso) {
            $permiso['excepciones']=[];
            $resultado[$permiso['nombreDashPer']]=$permiso;
        }
        return $resultado;
    }
}
