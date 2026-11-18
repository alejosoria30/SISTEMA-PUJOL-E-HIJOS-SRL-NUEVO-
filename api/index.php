<?php
declare(strict_types=1);
require __DIR__.'/src/Conexion.php';
require __DIR__.'/src/Claves.php';
require __DIR__.'/src/Acceso.php';
require __DIR__.'/src/Catalogo.php';
require __DIR__.'/src/ReglaMayorista.php';
require __DIR__.'/src/Arqueo.php';
require __DIR__.'/src/PanelComercial.php';
require __DIR__.'/src/Ventas.php';
require __DIR__.'/src/ClienteMercadoPago.php';
require __DIR__.'/src/MercadoPago.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost'];
if (in_array($origin, $allowedOrigins, true) || empty($origin)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
function send_response($data,$status=200) {
    if ($status>=500) $data=['success'=>false,'message'=>'No se pudo completar la operación. Revise el registro del servidor.'];
    http_response_code($status); echo json_encode($data); exit;
}
set_exception_handler(function(Throwable $e) {
    if ($e instanceof DomainException) send_response(['message'=>$e->getMessage()],422);
    error_log('Pujol: '.get_class($e).' en '.basename($e->getFile()).' línea '.$e->getLine());
    send_response([],500);
});
$method=$_SERVER['REQUEST_METHOD'];
if ($method==='OPTIONS') { http_response_code(204); exit; }
$base=rtrim(dirname($_SERVER['SCRIPT_NAME']),'/');
$route='/'.trim(substr(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH),strlen($base)),'/');
$pdo=Conexion::abrir();
$acceso=new Acceso($pdo);
$entrada=json_decode(file_get_contents('php://input'),true)??[];
if (!is_array($entrada)) send_response(['message'=>'JSON inválido.'],400);
if ($route==='/auth/login' && $method==='POST') $acceso->ingresar($entrada);
$mp=new MercadoPago($pdo,$acceso,new ClienteMercadoPago());
if ($route==='/mp/retorno' && $method==='GET') {
    $mp->vincular($_GET); send_response(['message'=>'Cuenta vinculada. Podés cerrar esta pestaña y actualizar la configuración.']);
}
if ($route==='/mp/notificar' && $method==='POST') {
    $orden=$entrada['data']['id']??'';
    if (!is_string($orden) || !preg_match('/^[A-Za-z0-9_-]{4,100}$/D',$orden)) send_response([],400);
    // Solo se procesa una orden local. Todas las decisiones usan el GET autenticado al proveedor.
    $mp->verificar($orden); send_response(['recibido'=>true]);
}

$usuario=$acceso->usuario(); $actor=(int)$usuario['idUsu'];
$admin=in_array(1,$usuario['roles'],true);
$permisos=$admin ? [] : $acceso->permisos($actor);
if ($route==='/auth/logout' && $method==='POST') {
    $acceso->consultar('DELETE FROM sesiones_pos WHERE resumenToken=?',[$usuario['resumen']]);
    send_response(['success'=>true]);
}
if ($route==='/auth/me' && $method==='GET') send_response([
    'id'=>$actor,'username'=>$usuario['usuarioUsu'],'fullname'=>trim($usuario['nombreUsu'].' '.$usuario['apellidoUsu']),
    'firstname'=>$usuario['nombreUsu'],'lastname'=>$usuario['apellidoUsu'],'email'=>$usuario['correoUsu'],
    'roles'=>$usuario['roles'],'phone'=>$usuario['telefonoUsu'],'pic'=>'./assets/media/avatars/blank.png','permisos'=>$permisos
]);
$modulo=[
    '/dashboard'=>'Acceder al Dashboard','/mp/configuracion'=>'Gestionar Roles','/mp/cajas'=>'Cobros QR','/mp/cobros'=>'Cobros QR','/mp/verificar'=>'Cobros QR',
    '/ventas/productos'=>'Gestionar Ventas','/productos'=>'Catálogo de productos','/stock/productos'=>'Gestionar Stock','/subcategorias'=>'Clasificación de productos','/categorias'=>'Clasificación de productos','/movimientos-stock'=>'Ver movimientos de stock',
    '/ventas'=>$method==='GET'?'Ver Historial de Ventas':'Gestionar Ventas',
    '/ventas/marcar-prueba'=>'Ver Historial de Ventas',
    '/caja/turno'=>'Caja presencial','/caja/historial'=>'Ver historial de caja','/caja/movimientos'=>'Caja presencial',
    '/caja/abrir'=>'Caja presencial','/caja/cerrar'=>'Caja presencial','/caja/movimiento'=>'Caja presencial',
    '/comprobantes'=>'Comprobantes presenciales','/comprobantes/emitir'=>'Comprobantes presenciales',
    '/usuarios'=>'Gestionar Roles','/roles'=>'Gestionar Roles','/permisos'=>'Gestionar Roles',
    '/personal/resumen'=>'Gestionar Roles',
    '/configuracion'=>'Gestionar Roles','/actividad'=>'Gestionar Roles','/accesos-empleado'=>'Gestionar Roles'
][$route]??null;
if (!$modulo) send_response(['message'=>'Ruta inexistente.'],404);
$accion=$method==='GET'?'visualizar':($method==='DELETE'?'anular':(!empty($entrada['id'])||$route==='/caja/cerrar'?'modificar':'crear'));
if (!$admin && $route==='/mp/cobros' && $method==='POST' && empty($permisos['Gestionar Ventas']['crear'])) send_response(['message'=>'Permiso insuficiente.'],403);
if ($route==='/ventas/marcar-prueba' && !$admin) send_response(['message'=>'Solo el administrador puede clasificar las ventas de prueba.'],403);
// Corrección 15: autorización por acción y por opción de menú. Se verifica en cada petición.
// No se confía en los botones ocultos ni en el perfil que declara el navegador.
if ($route==='/movimientos-stock' && $method==='POST') {
    $tipo=$entrada['type']??null;
    if ($tipo==='Entrada') { $modulo='Registrar entradas de stock'; $accion='crear'; }
    elseif ($tipo==='Salida') { $modulo='Registrar salidas de stock'; $accion='crear'; }
    elseif ($tipo==='Ajuste') { $modulo='Ajustar cantidad de stock'; $accion='modificar'; }
    else send_response(['message'=>'Tipo de movimiento no válido.'],400);
}
// El detalle de un turno histórico exige su propio permiso; un cajero puede ver su turno abierto.
if ($route==='/caja/movimientos' && $method==='GET') {
    $turnoSolicitado=filter_var($_GET['idTurno']??null,FILTER_VALIDATE_INT);
    if (!$turnoSolicitado) send_response(['message'=>'Indique un turno válido.'],400);
    $estadoTurno=$acceso->consultar('SELECT estadoTurno FROM caja_turnos WHERE idTurno=?',[$turnoSolicitado])->fetchColumn();
    if ($estadoTurno===false) send_response(['message'=>'Turno inexistente.'],404);
    $modulo=$estadoTurno==='Cerrado'?'Ver historial de caja':'Caja presencial';
}
if ($route==='/subcategorias' && $method==='POST') {
    $accion=((int)($entrada['id']??$entrada['idSubcategoria']??0)>0)?'modificar':'crear';
}
if ($route==='/categorias' && $method==='POST') {
    $accion=((int)($entrada['id']??0)>0)?'modificar':'crear';
}
$lecturaAuxiliarCatalogo=(!$admin && $method==='GET'
    && in_array($route,['/categorias','/subcategorias'],true)
    && !empty($permisos['Catálogo de productos']['visualizar']));
if (!$admin && !$lecturaAuxiliarCatalogo && ($modulo==='Gestionar Roles' || empty($permisos[$modulo][$accion])))
    send_response(['message'=>'Su perfil no tiene autorización para esta operación.'],403);
if ($method!=='GET' && ($modulo==='Gestionar Roles' || $route==='/categorias'))
    $acceso->consultar('INSERT INTO auditoria_pos(idUsu,accion,referencia) VALUES(?,?,?)',[$actor,$method.' '.$route,(string)($entrada['id']??'')]);
if ($route==='/personal/resumen' && $method==='GET') {
    if (!$admin) send_response(['message'=>'Acceso exclusivo del administrador.'],403);
    send_response([
        'empleados'=>(int)$pdo->query("SELECT COUNT(*) FROM usuario WHERE rolUsu<>'Cliente'")->fetchColumn(),
        'empleadosActivos'=>(int)$pdo->query("SELECT COUNT(*) FROM usuario WHERE rolUsu<>'Cliente' AND estadoUsu='Activo'")->fetchColumn(),
        'perfiles'=>(int)$pdo->query("SELECT COUNT(*) FROM roles WHERE idRol<>3 AND nombreRol<>'Cliente'")->fetchColumn(),
        'permisos'=>(int)$pdo->query('SELECT COUNT(*) FROM dashboard_permisos')->fetchColumn(),
        'clientesHistoricos'=>(int)$pdo->query("SELECT COUNT(*) FROM usuario WHERE rolUsu='Cliente'")->fetchColumn(),
    ]);
}
if ($route==='/dashboard' && $method==='GET') {
    send_response((new PanelComercial($acceso))->consultar($_GET,$admin || !empty($permisos['Caja presencial']['visualizar'])));
}
if ($route==='/configuracion' && $admin) {
    if ($method==='GET') send_response($acceso->consultar('SELECT zonaHoraria FROM configuracion_comercio WHERE id=1')->fetch());
    if ($method==='POST') {
        $zona=$entrada['zonaHoraria']??'';
        if (!in_array($zona,DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC),true)) throw new DomainException('Indique una zona horaria válida.');
        $acceso->consultar('UPDATE configuracion_comercio SET zonaHoraria=? WHERE id=1',[$zona]);
        send_response(['success'=>true]);
    }
}
if ($route==='/mp/configuracion' && $admin) {
    if ($method==='GET') send_response(['cuentas'=>$pdo->query('SELECT idCuenta,vendedorExterno,activa FROM cuentas_mp')->fetchAll(),
        'cajas'=>$pdo->query('SELECT idCaja,externalPosId,idCuenta,activa FROM cajas_mp')->fetchAll()]);
    if ($method==='POST') {
        switch ($entrada['accion']??'') {
            case 'vincular': send_response(['url'=>$mp->autorizar($actor)]);
            case 'caja':
                $externa=trim($entrada['externa']??'');
                if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/D',$externa)) throw new DomainException('Identificador de caja inválido.');
                $mp->verificarCaja((int)$entrada['idCuenta'],$externa);
                $acceso->consultar('INSERT INTO cajas_mp(idCuenta,externalPosId) VALUES(?,?) ON DUPLICATE KEY UPDATE activa=1',[(int)$entrada['idCuenta'],$externa]); break;
            case 'desactivarCaja':
                $pdo->beginTransaction();
                $idCaja=(int)($entrada['idCaja']??0);
                $acceso->consultar('SELECT idCaja FROM cajas_mp WHERE idCaja=? FOR UPDATE',[$idCaja]);
                $pendiente=$acceso->consultar("SELECT 1 FROM cobros_pos JOIN ordenes_mp USING(idCobro) WHERE idCaja=? AND estado='pendiente' LIMIT 1",[$idCaja])->fetchColumn();
                if ($pendiente) { $pdo->rollBack(); throw new DomainException('Concilie el cobro pendiente de la caja.'); }
                $acceso->consultar('UPDATE cajas_mp SET activa=0 WHERE idCaja=?',[$idCaja]);
                $pdo->commit();
                break;
            case 'desvincular':
                $id=(int)$entrada['idCuenta'];
                $acceso->consultar("UPDATE cuentas_mp c SET c.activa=0,c.credencialesCifradas=NULL WHERE idCuenta=? AND NOT EXISTS(SELECT 1 FROM cajas_mp k JOIN ordenes_mp o USING(idCaja) JOIN cobros_pos p USING(idCobro) WHERE k.idCuenta=c.idCuenta AND p.estado='pendiente')",[$id]);
                if ($acceso->consultar('SELECT activa FROM cuentas_mp WHERE idCuenta=?',[$id])->fetchColumn()) throw new DomainException('Concilie las operaciones pendientes.');
                break;
            default: throw new DomainException('Acción desconocida.');
        }
        send_response(['success'=>true]);
    }
}
if ($route==='/mp/cajas' && $method==='GET') send_response($pdo->query('SELECT idCaja,externalPosId FROM cajas_mp JOIN cuentas_mp USING(idCuenta) WHERE cajas_mp.activa=1 AND cuentas_mp.activa=1')->fetchAll());
if ($route==='/mp/cobros') {
    if ($method==='POST') send_response($mp->iniciar($actor,$entrada));
    if ($method==='GET') send_response($acceso->consultar("SELECT c.idCobro,c.importe,c.estado,c.idVenta,c.tipoVenta,c.creado,o.ordenExterna,o.estadoProveedor,o.detalleEstado,(SELECT COALESCE(SUM(r.importe),0) FROM reembolsos_mp r WHERE r.idCobro=c.idCobro) reembolsado FROM cobros_pos c JOIN ordenes_mp o USING(idCobro) WHERE (?=1 OR c.idUsu=?) ORDER BY c.idCobro DESC LIMIT 100",[(int)$admin,$actor])->fetchAll());
}
if ($route==='/mp/verificar' && $method==='POST') {
    $q=$acceso->consultar('SELECT c.idUsu,c.estado,o.ordenExterna FROM cobros_pos c JOIN ordenes_mp o USING(idCobro) WHERE c.idCobro=?',[(int)($entrada['idCobro']??0)])->fetch();
    if (!$q || (!$admin && $q['idUsu']!=$actor)) send_response([],403);
    if (!$q['ordenExterna'] && $q['estado']!=='pendiente') send_response(['estado'=>$q['estado']]);
    if (!$q['ordenExterna']) {
        $c=$acceso->consultar('SELECT c.claveOperacion,c.tipoVenta,o.idCaja FROM cobros_pos c JOIN ordenes_mp o USING(idCobro) WHERE c.idCobro=?',[$entrada['idCobro']])->fetch();
        $items=$acceso->consultar('SELECT idProd productId,cantidad quantity FROM reservas_pos WHERE idCobro=? ORDER BY idProd',[$entrada['idCobro']])->fetchAll();
        $reintento=$mp->iniciar((int)$q['idUsu'],array_merge($c,['details'=>$items]));
        if ($reintento['estado']!=='pendiente') send_response($reintento);
        $q['ordenExterna']=$acceso->consultar('SELECT ordenExterna FROM ordenes_mp WHERE idCobro=?',[$entrada['idCobro']])->fetchColumn();
    }
    send_response($mp->verificar($q['ordenExterna']));
}

if ($route==='/actividad' && $method==='GET') send_response($acceso->consultar("SELECT fecha,accion,referencia FROM auditoria_pos WHERE idUsu=? OR ((accion='POST /accesos-empleado' OR accion LIKE 'Permiso %') AND referencia=?) ORDER BY idEvento DESC LIMIT 25",[(int)($_GET['id']??0),(string)(int)($_GET['id']??0)])->fetchAll());
if ($route==='/accesos-empleado') {
    $id=(int)($_GET['id']??$entrada['id']??0);
    if ($method==='GET') send_response($acceso->permisos($id));
    if ($method==='POST') send_response([
        'message'=>'Los permisos se configuran desde Perfiles (Roles), no por empleado.'
    ],409);
}
if ($route === '/subcategorias') {
    if ($method === 'GET') {
        send_response($pdo->query('SELECT s.idSubcategoria,s.idCategoria,s.nombre,s.activa,c.nombre AS categoria
            FROM subcategorias_producto s JOIN categorias_producto c ON c.idCategoria=s.idCategoria
            ORDER BY c.nombre,s.nombre,s.idSubcategoria')->fetchAll());
    }
    if ($method === 'POST') {
        $id=(int)($entrada['id']??0);
        $idCategoria=(int)($entrada['idCategoria']??0);
        $nombre=trim((string)($entrada['nombre']??''));
        if ($nombre==='' || mb_strlen($nombre)>100) throw new DomainException('Revise el nombre de la subcategoría.');
        if ($idCategoria<=0) throw new DomainException('Seleccione la categoría principal.');
        $pdo->beginTransaction();
        try {
            $categoria=$acceso->consultar('SELECT idCategoria,activa FROM categorias_producto WHERE idCategoria=?',[$idCategoria])->fetch();
            if (!$categoria) throw new DomainException('La categoría seleccionada no existe.');
            if ($id) {
                $anterior=$acceso->consultar('SELECT idCategoria FROM subcategorias_producto WHERE idSubcategoria=? FOR UPDATE',[$id])->fetch();
                if (!$anterior) throw new DomainException('La subcategoría ya no existe.');
                if ($idCategoria!==(int)$anterior['idCategoria']) {
                    if (!(int)$categoria['activa']) throw new DomainException('Para moverla, seleccione una categoría activa.');
                    $enUso=$acceso->consultar('SELECT 1 FROM productos WHERE idSubcategoria=? LIMIT 1',[$id])->fetchColumn();
                    if ($enUso) throw new DomainException('Esta subcategoría tiene productos asociados. Reclasifique esos productos antes de moverla.');
                }
                $acceso->consultar('UPDATE subcategorias_producto SET nombre=?,activa=?,idCategoria=? WHERE idSubcategoria=?',
                    [$nombre,(int)!empty($entrada['activa']),$idCategoria,$id]);
            } else {
                if (!(int)$categoria['activa']) throw new DomainException('Seleccione una categoría activa.');
                $acceso->consultar('INSERT INTO subcategorias_producto(idCategoria,nombre) VALUES(?,?)',[$idCategoria,$nombre]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($e instanceof PDOException && $e->getCode()==='23000')
                throw new DomainException('Ya existe esa subcategoría dentro de la categoría seleccionada.');
            throw $e;
        }
        send_response(['success'=>true]);
    }
}
if ($route==='/categorias') {
    if ($method==='GET') send_response($pdo->query('SELECT idCategoria,nombre,activa FROM categorias_producto ORDER BY nombre')->fetchAll());
    if ($method==='POST') {
        $nombre=trim($entrada['nombre']??'');
        if (!$nombre || mb_strlen($nombre)>100) throw new DomainException('Nombre de categoría inválido.');
        $id=(int)($entrada['id']??0);
        if ($acceso->consultar('SELECT 1 FROM categorias_producto WHERE nombre=? AND idCategoria<>?',[$nombre,$id])->fetchColumn()) throw new DomainException('Ya existe una categoría con ese nombre.');
        if ($id) $acceso->consultar('UPDATE categorias_producto SET nombre=?,activa=? WHERE idCategoria=?',[$nombre,(int)!empty($entrada['activa']),$id]);
        else $acceso->consultar('INSERT INTO categorias_producto(nombre) VALUES(?)',[$nombre]);
        send_response(['success'=>true]);
    }
}
if ($route==='/stock/productos' && $method==='GET') send_response((new Catalogo($pdo))->listar());
if ($route==='/ventas/productos' && $method==='GET') send_response(array_values(array_filter((new Catalogo($pdo))->listar(), static fn($p)=>$p['status']==='Activo')));
if ($route==='/productos') {
    $catalogo=new Catalogo($pdo);
    if ($method==='GET') send_response($catalogo->listar());
    if ($method==='POST') {
        if (!$admin && empty($permisos['Ajustar cantidad de stock']['modificar'])) {
            $idProducto=(int)($entrada['id']??0);
            if (!isset($entrada['quantity']) || !is_numeric($entrada['quantity']))
                throw new DomainException('Indique una cantidad de stock válida.');
            $cantidadSolicitada=(float)$entrada['quantity'];
            if ($idProducto>0) {
                $cantidadActual=$acceso->consultar(
                    'SELECT stockActual FROM inventario WHERE idProd=?',[$idProducto]
                )->fetchColumn();
                if ($cantidadActual===false) throw new DomainException('Producto inexistente.');
                if (round($cantidadSolicitada,3)!==round((float)$cantidadActual,3))
                    send_response(['message'=>'Su perfil no permite modificar la cantidad de stock.'],403);
            } elseif (round($cantidadSolicitada,3)!==0.0) {
                send_response(['message'=>'Su perfil no permite establecer stock inicial distinto de cero.'],403);
            }
        }
        send_response(['success'=>true,'id'=>$catalogo->guardar($entrada,$actor)]);
    }
    if ($method==='DELETE') {
        $acceso->consultar("UPDATE productos SET estadoProd='Inactivo' WHERE idProd=?",[(int)($_GET['id']??0)]);
        send_response(['success'=>true]);
    }
}
if ($route==='/ventas' && $method==='POST') send_response(['success'=>true,'id'=>Ventas::registrar($pdo,$actor,$entrada)]);
if ($route === '/movimientos-stock') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT m.idMovStock as id, m.idProd as productId, p.nombreProd as productName, p.codigoProd as productCode,
                                    m.tipoMovimiento as type, m.cantidad as quantity, m.fechaMovimiento as date, 
                                    m.idUsu as userId, u.nombreUsu as userName, m.observaciones as observations
                             FROM movimientos_stock m
                             JOIN productos p ON m.idProd = p.idProd
                             JOIN usuario u ON m.idUsu = u.idUsu
                             ORDER BY m.fechaMovimiento DESC");
        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['productId'] = (int)$item['productId'];
            $item['quantity'] = (float)$item['quantity'];
            $item['userId'] = (int)$item['userId'];
        }
        send_response($items);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $productId = isset($input['productId']) ? (int)$input['productId'] : 0;
        $type = $input['type'] ?? '';
        $quantity = isset($input['quantity']) ? (float)$input['quantity'] : 0;
        $userId = $actor;
        $observations = trim((string)($input['observations'] ?? ''));
        if ($type==='Ajuste' && $observations==='')
            throw new DomainException('Explique el motivo del ajuste de inventario.');
        if (mb_strlen($observations)>255) throw new DomainException('La observación es demasiado extensa.');

        if ($productId <= 0 || !in_array($type,['Entrada','Salida','Ajuste'],true)
            || !is_finite($quantity) || ($type==='Ajuste' ? $quantity<0 : $quantity<=0)) {
            send_response(["success" => false, "message" => "Producto, tipo de movimiento y cantidad son obligatorios"], 400);
        }

        try {
            $pdo->beginTransaction();
            
            $existencia=$acceso->consultar('SELECT stockActual FROM inventario WHERE idProd=? FOR UPDATE',[$productId])->fetchColumn();
            if ($existencia===false || ($type==='Salida' && $existencia<$quantity)) { $pdo->rollBack(); send_response(['message'=>'Stock insuficiente.'],409); }
            // Insert movement
            $stmt = $pdo->prepare("INSERT INTO movimientos_stock (idProd, tipoMovimiento, cantidad, idUsu, observaciones) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$productId, $type, $quantity, $userId, $observations]);
            $id = $pdo->lastInsertId();
            
            // Update inventory
            if ($type === 'Entrada') {
                $stmtInv = $pdo->prepare("UPDATE inventario SET stockActual = stockActual + ? WHERE idProd = ?");
                $stmtInv->execute([$quantity, $productId]);
            } else if ($type === 'Salida') {
                $stmtInv = $pdo->prepare("UPDATE inventario SET stockActual = stockActual - ? WHERE idProd = ?");
                $stmtInv->execute([$quantity, $productId]);
            } else if ($type === 'Ajuste') {
                $stmtInv = $pdo->prepare("UPDATE inventario SET stockActual = ? WHERE idProd = ?");
                $stmtInv->execute([$quantity, $productId]);
            }
            
            $pdo->commit();
            send_response(["success" => true, "id" => (int)$id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al registrar el movimiento: " . $e->getMessage()], 500);
        }
    }
}

// Consultas del historial: una sola consulta para ventas y otra para los detalles.
// Esto evita ejecutar una consulta adicional por cada venta registrada.
if ($route === '/ventas' && $method === 'GET') {
    $ventas=$pdo->query("SELECT v.idVenta AS id,v.fechaVenta AS date,v.totalVenta AS total,
            v.tipoVenta,c.medio,c.estado AS estadoCobro,v.estadoVenta AS status,v.esPrueba,
            u.nombreUsu AS userName
        FROM ventas v LEFT JOIN cobros_pos c ON c.idVenta=v.idVenta
        LEFT JOIN usuario u ON u.idUsu=v.idUsu
        ORDER BY v.fechaVenta ASC,v.idVenta ASC")->fetchAll();
    $detalles=$pdo->query("SELECT d.idVenta,d.idDetalle AS detailId,d.idProd AS productId,
        p.nombreProd AS productName,d.cantidad AS quantity,d.precioUnitario AS price,d.subtotal
        FROM detalle_venta d LEFT JOIN productos p ON p.idProd=d.idProd
        ORDER BY d.idVenta DESC,d.idDetalle ASC")->fetchAll();
    $porVenta=[];
    foreach ($detalles as $detalle) {
        $ventaId=(int)$detalle['idVenta'];
        unset($detalle['idVenta']);
        foreach (['detailId','productId'] as $campo) $detalle[$campo]=(int)$detalle[$campo];
        foreach (['quantity','price','subtotal'] as $campo) $detalle[$campo]=(float)$detalle[$campo];
        $porVenta[$ventaId][]=$detalle;
    }
    foreach ($ventas as &$venta) {
        $venta['id']=(int)$venta['id'];
        $venta['total']=(float)$venta['total'];
        $venta['esPrueba']=(bool)$venta['esPrueba'];
        $venta['details']=$porVenta[$venta['id']]??[];
    }
    unset($venta);
    send_response($ventas);
}

// Etiquetado no destructivo para la analítica. No altera cobros, stock, caja ni comprobantes.
if ($route==='/ventas/marcar-prueba' && $method==='POST') {
    $id=(int)($entrada['id']??0);
    if ($id<=0 || !isset($entrada['esPrueba']) || !is_bool($entrada['esPrueba']))
        throw new DomainException('Indique una venta y su clasificación.');
    $pdo->beginTransaction();
    try {
        $venta=$acceso->consultar('SELECT idVenta,esPrueba FROM ventas WHERE idVenta=? FOR UPDATE',[$id])->fetch();
        if (!$venta) throw new DomainException('La venta indicada no existe.');
        if ((bool)$venta['esPrueba']!==$entrada['esPrueba']) {
            $acceso->consultar('UPDATE ventas SET esPrueba=? WHERE idVenta=?',[(int)$entrada['esPrueba'],$id]);
            $acceso->consultar('INSERT INTO auditoria_pos(idUsu,accion,referencia) VALUES(?,?,?)',
                [$actor,$entrada['esPrueba']?'Marcar venta de prueba':'Restaurar venta real',(string)$id]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    send_response(['success'=>true]);
}
if (strpos($route, '/caja/') === 0) {

    // HISTORIAL DE TURNOS CERRADOS
    // ==========================================

    if ($route === '/caja/historial' && $method === 'GET') {

        try {
            $sql = "SELECT
                        t.idTurno,
                        t.fechaApertura,
                        t.fechaCierre, a.billetes, a.otros, a.observaciones, responsable.usuarioUsu responsable,

                        t.montoInicial,
                        t.montoFinal,
                        t.diferencia,
                        t.estadoTurno,
                        t.idUsu,
                        u.nombreUsu AS userName,
                        COALESCE(m.ingresos, 0) AS ingresos,
                        COALESCE(m.egresos, 0) AS egresos,
                        COALESCE(m.totalMovimientos, 0) AS totalMovimientos
                    FROM caja_turnos t
                    LEFT JOIN usuario u ON u.idUsu = t.idUsu
                    LEFT JOIN arqueos_pos a ON a.idTurno=t.idTurno
                    LEFT JOIN usuario responsable ON responsable.idUsu=a.idUsu
                    LEFT JOIN (
                        SELECT
                            idTurno,
                            SUM(
                                CASE
                                    WHEN tipoMovimiento = 'Ingreso'
                                    THEN monto ELSE 0
                                END
                            ) AS ingresos,
                            SUM(
                                CASE
                                    WHEN tipoMovimiento = 'Egreso'
                                    THEN monto ELSE 0
                                END
                            ) AS egresos,
                            COUNT(*) AS totalMovimientos
                        FROM movimientos_caja
                        GROUP BY idTurno
                    ) m ON m.idTurno = t.idTurno
                    WHERE t.estadoTurno = 'Cerrado'
                    ORDER BY t.fechaCierre DESC, t.idTurno DESC
                    LIMIT 100";

            $turnos = $pdo->query($sql)->fetchAll();

            foreach ($turnos as &$t) {
                $t['idTurno'] = (int)$t['idTurno'];
                $t['idUsu'] = (int)$t['idUsu'];

                foreach (
                    ['montoInicial', 'montoFinal', 'diferencia', 'ingresos', 'egresos']
                    as $campo
                ) {
                    $t[$campo] = round((float)$t[$campo], 2);
                }

                $t['billetes'] = $t['billetes'] === null ? null : json_decode($t['billetes'],true);
                $t['totalMovimientos'] = (int)$t['totalMovimientos'];

                $t['saldoEsperado'] = round(
                    $t['montoInicial'] + $t['ingresos'] - $t['egresos'],
                    2
                );
            }

            unset($t);

            send_response($turnos);

        } catch (Throwable $e) {
            error_log('Historial caja: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudo cargar el historial de caja.'
            ], 500);
        }
    }

    // ==========================================
    // CONSULTAR TURNO ACTUAL
    // ==========================================

    if ($route === '/caja/turno' && $method === 'GET') {

        try {
            $stmt = $pdo->query("
                SELECT
                    t.idTurno,
                    t.fechaApertura,
                    t.montoInicial,
                    t.estadoTurno,
                    u.nombreUsu AS userName
                FROM caja_turnos t
                LEFT JOIN usuario u ON u.idUsu = t.idUsu
                WHERE t.estadoTurno = 'Abierto'
                ORDER BY t.idTurno DESC
                LIMIT 1
            ");

            $turno = $stmt->fetch();

            if ($turno) {
                $turno['idTurno'] = (int)$turno['idTurno'];
                $turno['montoInicial'] = (float)$turno['montoInicial'];

                $s = $pdo->prepare("
                    SELECT COALESCE(
                        SUM(
                            CASE
                                WHEN tipoMovimiento = 'Ingreso'
                                THEN monto ELSE -monto
                            END
                        ), 0
                    )
                    FROM movimientos_caja
                    WHERE idTurno = ?
                ");

                $s->execute([$turno['idTurno']]);

                $turno['movimientosPorTipo']=$acceso->consultar('SELECT tipoMovimiento,SUM(monto) total FROM movimientos_caja WHERE idTurno=? GROUP BY tipoMovimiento',[$turno['idTurno']])->fetchAll();
                $turno['electronicos']=$acceso->consultar("SELECT c.medio,SUM(c.importe-COALESCE(r.devuelto,0)) total FROM cobros_pos c LEFT JOIN (SELECT idCobro,SUM(importe) devuelto FROM reembolsos_mp GROUP BY idCobro) r USING(idCobro) WHERE idTurno=? AND estado='aprobado' AND medio<>'efectivo' GROUP BY c.medio",[$turno['idTurno']])->fetchAll();
                $turno['saldoActual'] = round(
                    $turno['montoInicial'] + (float)$s->fetchColumn(),
                    2
                );
            }

            send_response([
                'success' => true,
                'turno' => $turno ?: null
            ]);

        } catch (Throwable $e) {
            error_log('Turno caja: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudo consultar el turno.'
            ], 500);
        }
    }

    // ==========================================
    // APERTURA DE CAJA
    // ==========================================

    if ($route === '/caja/abrir' && $method === 'POST') {

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $raw = $input['montoInicial'] ?? null;
        $monto = is_numeric($raw) ? (float)$raw : null;

        // Validación del servidor: no confiar en min/required de Angular.
        // No aceptar importes que redondeen a $0, importes con fracciones de centavo
        // ni importes fuera del rango DECIMAL(10,2) de caja_turnos.
        if ($monto === null || !is_finite($monto) || $monto < 0.01 || $monto > 99999999.99
            || abs($monto * 100 - round($monto * 100)) > 0.000001) {
            send_response([
                'success' => false,
                'message' => 'El fondo inicial es obligatorio, debe ser mayor que $0 y tener hasta dos decimales.'
            ], 400);
        }

        $lockTomado = false;

        try {
            $lockTomado = (int)$pdo->query(
                "SELECT GET_LOCK('pujol_caja_apertura', 5)"
            )->fetchColumn() === 1;

            if (!$lockTomado) {
                send_response([
                    'success' => false,
                    'message' => 'Hay otra apertura en proceso.'
                ], 409);
            }

            $existente = $pdo->query("
                SELECT idTurno
                FROM caja_turnos
                WHERE estadoTurno = 'Abierto'
                LIMIT 1
            ")->fetchColumn();

            if ($existente) {
                $pdo->query("SELECT RELEASE_LOCK('pujol_caja_apertura')");

                send_response([
                    'success' => false,
                    'message' => 'Ya existe una caja abierta.'
                ], 409);
            }

            $stmt = $pdo->prepare("
                INSERT INTO caja_turnos
                (montoInicial, idUsu, estadoTurno)
                VALUES (?, ?, 'Abierto')
            ");

            $stmt->execute([round($monto, 2), $actor]);

            $id = (int)$pdo->lastInsertId();

            $pdo->query("SELECT RELEASE_LOCK('pujol_caja_apertura')");

            send_response([
                'success' => true,
                'idTurno' => $id
            ]);

        } catch (Throwable $e) {
            if ($lockTomado) {
                try {
                    $pdo->query("SELECT RELEASE_LOCK('pujol_caja_apertura')");
                } catch (Throwable $ignored) {}
            }

            error_log('Apertura caja: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudo abrir la caja.'
            ], 500);
        }
    }

    // ==========================================
    // ARQUEO Y CIERRE DE CAJA
    // ==========================================

    if ($route === '/caja/cerrar' && $method === 'POST') {

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = filter_var($input['idTurno'] ?? null, FILTER_VALIDATE_INT);
        $arqueo = $input['arqueo'] ?? null;
        $raw = $arqueo === null ? ($input['montoFinal'] ?? null) : Arqueo::total($arqueo);

        if (!$id || !is_numeric($raw) || !is_finite((float)$raw) || (float)$raw < 0) {
            send_response([
                'success' => false,
                'message' => 'Debe ingresar el dinero realmente contado en caja.'
            ], 400);
        }

        $contado = round((float)$raw, 2);

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                SELECT idTurno, montoInicial, estadoTurno
                FROM caja_turnos
                WHERE idTurno = ?
                FOR UPDATE
            ");

            $stmt->execute([$id]);
            $turno = $stmt->fetch();

            if (!$turno || $turno['estadoTurno'] !== 'Abierto') {
                $pdo->rollBack();

                send_response([
                    'success' => false,
                    'message' => 'Turno inexistente o ya cerrado.'
                ], 409);
            }

            $stmt = $pdo->prepare("
                SELECT COALESCE(
                    SUM(
                        CASE
                            WHEN tipoMovimiento = 'Ingreso'
                            THEN monto ELSE -monto
                        END
                    ), 0
                )
                FROM movimientos_caja
                WHERE idTurno = ?
            ");

            $stmt->execute([$id]);

            $esperado = round(
                (float)$turno['montoInicial'] + (float)$stmt->fetchColumn(),
                2
            );

            $diferencia = round($contado - $esperado, 2);

            $stmt = $pdo->prepare("
                UPDATE caja_turnos
                SET fechaCierre = CURRENT_TIMESTAMP,
                    montoFinal = ?,
                    diferencia = ?,
                    estadoTurno = 'Cerrado'
                WHERE idTurno = ?
                AND estadoTurno = 'Abierto'
            ");

            if ($arqueo !== null) {
                $acceso->consultar('INSERT INTO arqueos_pos(idTurno,idUsu,billetes,otros,observaciones) VALUES(?,?,?,?,?)',
                    [$id,$actor,json_encode($arqueo['billetes'],JSON_THROW_ON_ERROR),$arqueo['otros']??0,$arqueo['observaciones']??'']);
            }
            $stmt->execute([$contado, $diferencia, $id]);

            if ($stmt->rowCount() !== 1) {
                $pdo->rollBack();

                send_response([
                    'success' => false,
                    'message' => 'No se pudo finalizar el cierre.'
                ], 409);
            }

            $pdo->commit();

            send_response([
                'success' => true,
                'saldoEsperado' => $esperado,
                'montoFinal' => $contado,
                'diferencia' => $diferencia
            ]);

        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            error_log('Cierre caja: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudo guardar el cierre.'
            ], 500);
        }
    }

    // ==========================================
    // MOVIMIENTOS DE TURNOS
    // ==========================================

    if ($route === '/caja/movimientos' && $method === 'GET') {

        $id = filter_var($_GET['idTurno'] ?? null, FILTER_VALIDATE_INT);

        if (!$id) {
            send_response([
                'success' => false,
                'message' => 'Turno invalido.'
            ], 400);
        }

        try {
            $stmt = $pdo->prepare("
                SELECT
                    m.idMovCaja,
                    m.tipoMovimiento,
                    m.concepto,
                    m.monto,
                    m.fechaMovimiento,
                    m.idVenta,
                    u.nombreUsu AS userName
                FROM movimientos_caja m
                LEFT JOIN usuario u ON u.idUsu = m.idUsu
                WHERE m.idTurno = ?
                ORDER BY m.fechaMovimiento DESC, m.idMovCaja DESC
            ");

            $stmt->execute([$id]);
            $movs = $stmt->fetchAll();

            foreach ($movs as &$m) {
                $m['idMovCaja'] = (int)$m['idMovCaja'];
                $m['monto'] = (float)$m['monto'];

                $m['idVenta'] = $m['idVenta'] !== null
                    ? (int)$m['idVenta']
                    : null;
            }

            unset($m);

            send_response($movs);

        } catch (Throwable $e) {
            error_log('Movimientos caja: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudieron consultar los movimientos.'
            ], 500);
        }
    }

    // ==========================================
    // MOVIMIENTO MANUAL SIN DUPLICADOS
    // ==========================================

    if ($route === '/caja/movimiento' && $method === 'POST') {

        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        $id = filter_var($input['idTurno'] ?? null, FILTER_VALIDATE_INT);
        $tipo = $input['tipoMovimiento'] ?? '';
        $concepto = trim((string)($input['concepto'] ?? ''));
        $raw = $input['monto'] ?? null;
        $key = (string)($input['requestKey'] ?? '');

        if (
            !$id ||
            !in_array($tipo, ['Ingreso', 'Egreso'], true) ||
            $concepto === '' ||
            strlen($concepto) > 200 ||
            !is_numeric($raw) ||
            !is_finite((float)$raw) ||
            (float)$raw <= 0 ||
            !preg_match('/^[A-Za-z0-9_-]{8,64}$/', $key)
        ) {
            send_response([
                'success' => false,
                'message' => 'Verifique tipo, concepto, importe y clave de operacion.'
            ], 400);
        }

        $monto = round((float)$raw, 2);

        if ($monto <= 0) {
            send_response([
                'success' => false,
                'message' => 'El monto minimo es $0,01.'
            ], 400);
        }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                SELECT estadoTurno
                FROM caja_turnos
                WHERE idTurno = ?
                FOR UPDATE
            ");

            $stmt->execute([$id]);
            $turno = $stmt->fetch();

            if (!$turno) {
                $pdo->rollBack();

                send_response([
                    'success' => false,
                    'message' => 'El turno no existe.'
                ], 404);
            }

            // Comprobar si la solicitud ya fue registrada
            $stmt = $pdo->prepare("
                SELECT
                    idMovCaja,
                    idTurno,
                    tipoMovimiento,
                    concepto,
                    monto
                FROM movimientos_caja
                WHERE requestKey = ?
                LIMIT 1
            ");

            $stmt->execute([$key]);
            $anterior = $stmt->fetch();

            if ($anterior) {
                $igual = (int)$anterior['idTurno'] === (int)$id
                    && $anterior['tipoMovimiento'] === $tipo
                    && $anterior['concepto'] === $concepto
                    && round((float)$anterior['monto'], 2) === $monto;

                $pdo->commit();

                if (!$igual) {
                    send_response([
                        'success' => false,
                        'message' => 'La clave ya se utilizo con otra operacion.'
                    ], 409);
                }

                send_response([
                    'success' => true,
                    'idMovCaja' => (int)$anterior['idMovCaja'],
                    'duplicadoEvitado' => true
                ]);
            }

            if ($turno['estadoTurno'] !== 'Abierto') {
                $pdo->rollBack();

                send_response([
                    'success' => false,
                    'message' => 'No se permiten movimientos en un turno cerrado.'
                ], 409);
            }

            $stmt = $pdo->prepare("
                INSERT INTO movimientos_caja
                (idTurno, tipoMovimiento, concepto, monto, idUsu, requestKey)
                VALUES (?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([$id, $tipo, $concepto, $monto, $actor, $key]);

            $idMov = (int)$pdo->lastInsertId();

            $pdo->commit();

            send_response([
                'success' => true,
                'idMovCaja' => $idMov
            ]);

        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            if ($e->getCode() == '23000') {
                $stmt = $pdo->prepare("
                    SELECT idMovCaja, idTurno, tipoMovimiento, concepto, monto
                    FROM movimientos_caja
                    WHERE requestKey = ?
                    LIMIT 1
                ");

                $stmt->execute([$key]);
                $anterior = $stmt->fetch();

                if (
                    $anterior &&
                    (int)$anterior['idTurno'] === (int)$id &&
                    $anterior['tipoMovimiento'] === $tipo &&
                    $anterior['concepto'] === $concepto &&
                    round((float)$anterior['monto'], 2) === $monto
                ) {
                    send_response([
                        'success' => true,
                        'idMovCaja' => (int)$anterior['idMovCaja'],
                        'duplicadoEvitado' => true
                    ]);
                }

                send_response([
                    'success' => false,
                    'message' => 'Clave repetida con datos diferentes.'
                ], 409);
            }

            error_log('Registro movimiento: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudo registrar el movimiento.'
            ], 500);

        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            error_log('Registro movimiento: ' . $e->getMessage());

            send_response([
                'success' => false,
                'message' => 'No se pudo registrar el movimiento.'
            ], 500);
        }
    }
}

// Handle CRUD for /comprobantes
if (strpos($route, '/comprobantes') === 0) {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT c.idComp, c.tipoComp, c.numeroComp, c.fechaEmision, c.idVenta, c.totalComp, v.tipoVenta, v.fechaVenta, u.nombreUsu as userName
                             FROM comprobantes c
                             JOIN ventas v ON c.idVenta = v.idVenta
                             LEFT JOIN usuario u ON v.idUsu = u.idUsu
                             ORDER BY c.fechaEmision DESC");
        $comps = $stmt->fetchAll();
        foreach ($comps as &$c) {
            $c['idComp'] = (int)$c['idComp'];
            $c['idVenta'] = (int)$c['idVenta'];
            $c['totalComp'] = (float)$c['totalComp'];
            
            // Get details from venta
            $stmtDet = $pdo->prepare("SELECT d.idProd as productId, p.nombreProd as productName, d.cantidad as quantity, d.precioUnitario as price, d.subtotal as subtotal 
                                      FROM detalle_venta d
                                      LEFT JOIN productos p ON d.idProd = p.idProd
                                      WHERE d.idVenta = ?");
            $stmtDet->execute([$c['idVenta']]);
            $c['details'] = $stmtDet->fetchAll();
            foreach ($c['details'] as &$d) {
                $d['quantity'] = (float)$d['quantity'];
                $d['price'] = (float)$d['price'];
                $d['subtotal'] = (float)$d['subtotal'];
            }
        }
        send_response($comps);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $idVenta = isset($input['idVenta']) ? (int)$input['idVenta'] : 0;
        $tipoComp = $input['tipoComp'] ?? 'Ticket';
        
        if ($idVenta <= 0) {
            send_response(["success" => false, "message" => "ID de Venta inválido"], 400);
        }
        
        try {
            $pdo->beginTransaction();
            
            // Validate if comprobante already exists for this sale
            $acceso->consultar('SELECT idVenta FROM ventas WHERE idVenta=? FOR UPDATE',[$idVenta]);
            $check = $pdo->prepare("SELECT idComp, numeroComp FROM comprobantes WHERE idVenta = ? LIMIT 1");
            $check->execute([$idVenta]);
            $existing = $check->fetch();
            if ($existing) {
                $pdo->rollBack();
                send_response(["success" => true, "idComp" => (int)$existing['idComp'], "numeroComp" => $existing['numeroComp'], "message" => "Comprobante ya existente"]);
            }
            
            // Get sale total
            $getVenta = $pdo->prepare("SELECT totalVenta FROM ventas WHERE idVenta = ?");
            $getVenta->execute([$idVenta]);
            $venta = $getVenta->fetch();
            if (!$venta) {
                $pdo->rollBack();
                send_response(["success" => false, "message" => "Venta no encontrada"], 404);
            }
            $total = $venta['totalVenta'];
            
            // Generate receipt number (mock logic)
            $prefix = '';
            switch($tipoComp) {
                case 'Factura A': $prefix = 'A-0001-'; break;
                case 'Factura B': $prefix = 'B-0001-'; break;
                case 'Factura C': $prefix = 'C-0001-'; break;
                default: $prefix = 'T-0001-'; break;
            }
            $numComp = $prefix . str_pad((string)$idVenta, 8, '0', STR_PAD_LEFT);
            
            $stmt = $pdo->prepare("INSERT INTO comprobantes (tipoComp, numeroComp, idVenta, totalComp) VALUES (?, ?, ?, ?)");
            $stmt->execute([$tipoComp, $numComp, $idVenta, $total]);
            
            $idComp=(int)$pdo->lastInsertId();
            $pdo->commit();
            send_response(["success" => true, "idComp" => $idComp, "numeroComp" => $numComp]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al emitir comprobante: " . $e->getMessage()], 500);
        }
    }
}

// =============================================================
if ($route === '/permisos') {
    $permisosFijos=[
       'Acceder al Dashboard','Gestionar Stock','Gestionar Ventas','Gestionar Roles',
       'Ver Historial de Ventas','Modificar Mi Perfil','Caja presencial',
       'Comprobantes presenciales','Catálogo de productos','Clasificación de productos',
       'Cobros QR','Ajustar cantidad de stock','Ver movimientos de stock',
       'Registrar entradas de stock','Registrar salidas de stock','Ver historial de caja'
    ];
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT idDashPer AS id, nombreDashPer AS name,
                fechaCreaDashPer AS created_at FROM dashboard_permisos WHERE idDashPer = ?");
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) send_response(['success'=>false, 'message'=>'Permiso no encontrado'], 404);
            $fila['id'] = (int)$fila['id'];
            $stmtRoles = $pdo->prepare("SELECT r.idRol AS id, r.nombreRol AS name
                FROM rol_permiso rp JOIN roles r ON r.idRol = rp.idRol AND r.idRol<>3 AND r.nombreRol<>'Cliente'
                WHERE rp.idDashPer = ? ORDER BY r.nombreRol");
            $stmtRoles->execute([$id]);
            $fila['roles'] = array_map(static fn($r) => [
                'id'=>(int)$r['id'], 'name'=>$r['name']
            ], $stmtRoles->fetchAll());
            send_response($fila);
        }

        // Parámetros controlados y LIMIT numérico nativo. Evita SQL con JSON agregado
        // por cada permiso y mantiene la respuesta compatible con DataTables.
        $busqueda = $_GET['search'] ?? '';
        if (is_array($busqueda)) $busqueda = $busqueda['value'] ?? '';
        if (!is_string($busqueda)) $busqueda = '';
        $busqueda = trim($busqueda);
        $patron = '%' . $busqueda . '%';
        $inicio = max(0, (int)($_GET['start'] ?? 0));
        $cantidad = min(1000, max(1, (int)($_GET['length'] ?? 10)));
        $draw = max(0, (int)($_GET['draw'] ?? 1));
        $total = (int)$pdo->query('SELECT COUNT(*) FROM dashboard_permisos')->fetchColumn();

        $where = '';
        if ($busqueda !== '') $where = ' WHERE nombreDashPer LIKE :busqueda';
        $query = "SELECT idDashPer AS id, nombreDashPer AS name,
                  fechaCreaDashPer AS created_at FROM dashboard_permisos"
                 . $where . " ORDER BY idDashPer ASC LIMIT :inicio, :cantidad";
        $stmt = $pdo->prepare($query);
        if ($busqueda !== '') $stmt->bindValue(':busqueda', $patron, PDO::PARAM_STR);
        $stmt->bindValue(':inicio', $inicio, PDO::PARAM_INT);
        $stmt->bindValue(':cantidad', $cantidad, PDO::PARAM_INT);
        $stmt->execute();
        $filas = $stmt->fetchAll();

        if ($busqueda !== '') {
            $stmtConteo = $pdo->prepare('SELECT COUNT(*) FROM dashboard_permisos WHERE nombreDashPer LIKE ?');
            $stmtConteo->execute([$patron]);
            $filtrados = (int)$stmtConteo->fetchColumn();
        } else {
            $filtrados = $total;
        }

        // Obtener los roles de toda la página en una sola consulta.
        $rolesPorPermiso = [];
        if ($filas) {
            $ids = array_map(static fn($fila) => (int)$fila['id'], $filas);
            $marcadores = implode(',', array_fill(0, count($ids), '?'));
            $stmtRoles = $pdo->prepare(
                "SELECT rp.idDashPer AS idPermiso, r.idRol AS id, r.nombreRol AS name
                 FROM rol_permiso rp JOIN roles r ON r.idRol = rp.idRol AND r.idRol<>3 AND r.nombreRol<>'Cliente'
                 WHERE rp.idDashPer IN ($marcadores)
                 ORDER BY rp.idDashPer, r.nombreRol"
            );
            foreach ($ids as $indice => $permisoId) {
                $stmtRoles->bindValue($indice + 1, $permisoId, PDO::PARAM_INT);
            }
            $stmtRoles->execute();
            foreach ($stmtRoles->fetchAll() as $rol) {
                $rolesPorPermiso[(int)$rol['idPermiso']][] = [
                    'id'=>(int)$rol['id'], 'name'=>$rol['name']
                ];
            }
        }
        foreach ($filas as &$fila) {
            $fila['id'] = (int)$fila['id'];
            $fila['roles'] = $rolesPorPermiso[$fila['id']] ?? [];
        }
        unset($fila);
        send_response([
            'draw'=>$draw, 'recordsTotal'=>$total,
            'recordsFiltered'=>$filtrados, 'data'=>$filas
        ]);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id   = isset($input['id']) ? (int)$input['id'] : 0;
        $name = trim($input['name'] ?? '');
        if (empty($name)) send_response(['success' => false, 'message' => 'El nombre es obligatorio'], 400);
        // Los nombres de los permisos básicos están referenciados en PHP y Angular.
        // Su cambio o eliminación haría fallar el control de accesos.
        if ($id>0) {
            $original=$acceso->consultar('SELECT nombreDashPer FROM dashboard_permisos WHERE idDashPer=?',[$id])->fetchColumn();
            if (in_array($original,$permisosFijos,true))
                send_response(['message'=>'Este permiso es parte del sistema y no se puede renombrar. Configure qué perfil lo utiliza.'],403);
        }
        if (in_array($name,$permisosFijos,true))
            send_response(['message'=>'Los permisos internos no se deben crear manualmente ni renombrar.'],403);

        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE dashboard_permisos SET nombreDashPer = ? WHERE idDashPer = ?");
                $stmt->execute([$name, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO dashboard_permisos (nombreDashPer) VALUES (?)");
                $stmt->execute([$name]);
                $id = (int)$pdo->lastInsertId();
            }
            send_response(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            if ($e->getCode() == '23000') {
                send_response(['success' => false, 'message' => 'Ya existe un permiso con ese nombre'], 400);
            }
            send_response(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) send_response(['success' => false, 'message' => 'ID no proporcionado'], 400);
        $nombre=$acceso->consultar('SELECT nombreDashPer FROM dashboard_permisos WHERE idDashPer=?',[$id])->fetchColumn();
        if (in_array($nombre,$permisosFijos,true))
            send_response(['message'=>'Este permiso forma parte del sistema. Puede retirarlo de los perfiles, pero no eliminarlo.'],403);
        try {
            $pdo->prepare("DELETE FROM dashboard_permisos WHERE idDashPer = ?")->execute([$id]);
            send_response(['success' => true]);
        } catch (Exception $e) {
            send_response(['success' => false, 'message' => 'No se puede eliminar: ' . $e->getMessage()], 400);
        }
    }
}

// =============================================================
// CRUD /roles
// =============================================================
if ($route === '/roles') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            // Single role with permissions and users
            $stmt = $pdo->prepare("SELECT idRol as id, nombreRol as name, fechaCreaRol as created_at FROM roles WHERE idRol = ?");
            $stmt->execute([$id]);
            $role = $stmt->fetch();
            if (!$role || $id === 3 || strcasecmp((string)$role['name'], 'Cliente')===0)
                send_response(['success' => false, 'message' => 'Perfil no disponible para empleados.'], 404);
            $role['id'] = (int)$role['id'];

            $stmtP = $pdo->prepare("SELECT p.idDashPer as id, p.nombreDashPer as name, rp.puede_ver, rp.puede_crear, rp.puede_modificar, rp.puede_eliminar FROM rol_permiso rp JOIN dashboard_permisos p ON p.idDashPer = rp.idDashPer WHERE rp.idRol = ?");
            $stmtP->execute([$id]);
            $role['permissions'] = array_map(fn($p) => ['id' => (int)$p['id'], 'name' => $p['name'], 'can_read' => (bool)$p['puede_ver'], 'can_create' => (bool)$p['puede_crear'], 'can_update' => (bool)$p['puede_modificar'], 'can_delete' => (bool)$p['puede_eliminar']], $stmtP->fetchAll());

            $stmtU = $pdo->prepare("SELECT u.idUsu as id, CONCAT(u.nombreUsu, IF(u.apellidoUsu != '' AND u.apellidoUsu != '-', CONCAT(' ', u.apellidoUsu), '')) as name, u.correoUsu as email FROM usuario_rol ur JOIN usuario u ON u.idUsu = ur.idUsu WHERE ur.idRol = ?");
            $stmtU->execute([$id]);
            $role['users'] = array_map(fn($u) => ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email']], $stmtU->fetchAll());

            send_response($role);
        }

        // Listado de roles: dos consultas relacionadas en vez de 2 consultas por rol.
        $roles=$pdo->query("SELECT idRol AS id,nombreRol AS name,fechaCreaRol AS created_at FROM roles WHERE idRol<>3 AND nombreRol<>'Cliente' ORDER BY idRol")->fetchAll();
        $porRol=[];
        foreach ($pdo->query("SELECT rp.idRol,p.idDashPer AS id,p.nombreDashPer AS name,
                rp.puede_ver,rp.puede_crear,rp.puede_modificar,rp.puede_eliminar
                FROM rol_permiso rp JOIN dashboard_permisos p ON p.idDashPer=rp.idDashPer
                ORDER BY rp.idRol,p.idDashPer")->fetchAll() as $permiso) {
            $porRol[(int)$permiso['idRol']][]=[
                'id'=>(int)$permiso['id'],'name'=>$permiso['name'],
                'can_read'=>(bool)$permiso['puede_ver'],
                'can_create'=>(bool)$permiso['puede_crear'],
                'can_update'=>(bool)$permiso['puede_modificar'],
                'can_delete'=>(bool)$permiso['puede_eliminar']
            ];
        }
        $usuariosPorRol=[];
        foreach ($pdo->query("SELECT ur.idRol,u.idUsu AS id,
                CONCAT(u.nombreUsu,IF(u.apellidoUsu!='' AND u.apellidoUsu!='-',CONCAT(' ',u.apellidoUsu),'')) AS name,
                u.correoUsu AS email
                FROM usuario_rol ur JOIN usuario u ON u.idUsu=ur.idUsu ORDER BY ur.idRol,u.idUsu")->fetchAll() as $usuarioRol) {
            $usuariosPorRol[(int)$usuarioRol['idRol']][]=[
                'id'=>(int)$usuarioRol['id'],'name'=>$usuarioRol['name'],'email'=>$usuarioRol['email']
            ];
        }
        foreach ($roles as &$rol) {
            $rol['id']=(int)$rol['id'];
            $rol['permissions']=$porRol[$rol['id']]??[];
            $rol['users']=$usuariosPorRol[$rol['id']]??[];
        }
        unset($rol);
        send_response(['recordsTotal' => count($roles), 'recordsFiltered' => count($roles), 'data' => $roles]);
    }

    if ($method === 'POST') {
        $input      = json_decode(file_get_contents('php://input'), true);
        $id         = isset($input['id']) ? (int)$input['id'] : 0;
        $name       = trim($input['name'] ?? '');
        $permissions = $input['permissions'] ?? [];

        if (empty($name)) send_response(['success' => false, 'message' => 'El nombre es obligatorio'], 400);
        if ($id===1 || strcasecmp($name,'Administrador')===0)
            send_response(['success'=>false,'message'=>'El perfil Administrador tiene acceso total por diseño y no se puede modificar desde esta matriz.'],403);
        if ($id===3 || strcasecmp($name,'Cliente')===0)
            send_response(['success'=>false,'message'=>'El perfil Cliente es histórico y no se puede gestionar desde personal.'],403);

        try {
            $pdo->beginTransaction();
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE roles SET nombreRol = ? WHERE idRol = ?");
                $stmt->execute([$name, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO roles (nombreRol) VALUES (?)");
                $stmt->execute([$name]);
                $id = (int)$pdo->lastInsertId();
            }
            // Sync permissions
            $pdo->prepare("DELETE FROM rol_permiso WHERE idRol = ?")->execute([$id]);
            $stmtRP = $pdo->prepare("INSERT INTO rol_permiso (idRol, idDashPer, puede_ver, puede_crear, puede_modificar, puede_eliminar) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($permissions as $p) {
                $pid = (int)($p['id'] ?? 0);
                if ($pid > 0) {
                    $canRead = !empty($p['can_read']) ? 1 : 0;
                    $canCreate = !empty($p['can_create']) ? 1 : 0;
                    $canUpdate = !empty($p['can_update']) ? 1 : 0;
                    $canDelete = !empty($p['can_delete']) ? 1 : 0;
                    // Always fallback to true if passing old permissionIds format (backward compatibility)
                    if (isset($p['can_read']) === false) {
                        $canRead = 1; $canCreate = $canUpdate = $canDelete = 0;
                    }
                    $stmtRP->execute([$id, $pid, $canRead, $canCreate, $canUpdate, $canDelete]);
                }
            }
            // Backward compatibility for permissionIds format
            if (empty($permissions) && !empty($input['permissionIds'])) {
                foreach ($input['permissionIds'] as $pid) {
                    $pid = (int)$pid;
                    if ($pid > 0) {
                        $stmtRP->execute([$id, $pid, 1, 0, 0, 0]);
                    }
                }
            }
            $pdo->commit();
            send_response(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if ($e->getCode() == '23000') send_response(['success' => false, 'message' => 'Ya existe un rol con ese nombre'], 400);
            send_response(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) send_response(['success' => false, 'message' => 'ID no proporcionado'], 400);
        if ($id===3 || $id===1) send_response(['message'=>'Este perfil está protegido.'],403);
        // Check if role has users
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuario_rol WHERE idRol = ?");
        $stmt->execute([$id]);
        if ((int)$stmt->fetchColumn() > 0) {
            send_response(['success' => false, 'message' => 'No se puede eliminar el rol porque tiene usuarios asignados. Reasigná los usuarios primero.'], 400);
        }
        try {
            $pdo->prepare("DELETE FROM roles WHERE idRol = ?")->execute([$id]);
            send_response(['success' => true]);
        } catch (Exception $e) {
            send_response(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }
}

// =============================================================
// CRUD /usuarios
// =============================================================
if ($route === '/usuarios') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT idUsu as id, CONCAT(nombreUsu, IF(apellidoUsu != '' AND apellidoUsu != '-', CONCAT(' ', apellidoUsu), '')) as name, correoUsu as email, estadoUsu as status, rolUsu as role_str, telefonoUsu as phone, usuarioUsu as username, fechaNacUsu as dob, direccionUsu as address FROM usuario WHERE idUsu = ? AND rolUsu <> 'Cliente'");
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            if (!$user) send_response(['success' => false, 'message' => 'Usuario no encontrado'], 404);
            $user['id'] = (int)$user['id'];

            $stmtR = $pdo->prepare("SELECT r.idRol as id, r.nombreRol as name FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE ur.idUsu = ?");
            $stmtR->execute([$id]);
            $user['roles'] = array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'permissions' => [], 'users' => []], $stmtR->fetchAll());

            send_response($user);
        }

        // Paged list with search
        $search  = '%' . ($_GET['search']['value'] ?? $_GET['search'] ?? '') . '%';
        $start   = (int)($_GET['start'] ?? 0);
        $length  = (int)($_GET['length'] ?? 10);
        $draw    = (int)($_GET['draw'] ?? 1);
        $roleFilter = $_GET['roleFilter'] ?? '';

        $total = (int)$pdo->query("SELECT COUNT(*) FROM usuario WHERE rolUsu <> 'Cliente'")->fetchColumn();

        $roleCondition = '';
        $roleParams = [];
        if (!empty($roleFilter)) {
            $roleCondition = " AND idUsu IN (SELECT ur.idUsu FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE r.nombreRol = ?) ";
            $roleParams[] = $roleFilter;
        }

        $stmtF = $pdo->prepare("SELECT COUNT(*) FROM usuario WHERE rolUsu <> 'Cliente' AND (nombreUsu LIKE ? OR correoUsu LIKE ? OR apellidoUsu LIKE ?)" . $roleCondition);
        $stmtF->execute(array_merge([$search, $search, $search], $roleParams));
        $filtered = (int)$stmtF->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT idUsu as id,
                CONCAT(nombreUsu, IF(apellidoUsu != '' AND apellidoUsu != '-', CONCAT(' ', apellidoUsu), '')) as name,
                correoUsu as email,
                estadoUsu as status,
                telefonoUsu as phone,
                usuarioUsu as username,
                fechaNacUsu as dob,
                direccionUsu as address
             FROM usuario
             WHERE rolUsu <> 'Cliente' AND (nombreUsu LIKE ? OR correoUsu LIKE ? OR apellidoUsu LIKE ?)" . $roleCondition . "
             ORDER BY FIELD(estadoUsu, 'Activo', 'Inactivo'), idUsu ASC
             LIMIT ?, ?"
        );
        $stmt->execute(array_merge([$search, $search, $search], $roleParams, [$start, $length]));
        $users = $stmt->fetchAll();

        // Roles de la página consultados en un lote para evitar N consultas por N empleados.
        $rolesPorUsuario=[];
        if ($users) {
            $ids=array_map(static fn($u)=>(int)$u['id'],$users);
            $signos=implode(',',array_fill(0,count($ids),'?'));
            $stmtR=$pdo->prepare("SELECT ur.idUsu,r.idRol AS id,r.nombreRol AS name
                FROM usuario_rol ur JOIN roles r ON r.idRol=ur.idRol
                WHERE ur.idUsu IN ($signos) ORDER BY ur.idUsu,r.idRol");
            $stmtR->execute($ids);
            foreach ($stmtR->fetchAll() as $fila) {
                $rolesPorUsuario[(int)$fila['idUsu']][]=[
                    'id'=>(int)$fila['id'],'name'=>$fila['name'],'permissions'=>[],'users'=>[]
                ];
            }
        }
        foreach ($users as &$user) {
            $user['id']=(int)$user['id'];
            $user['roles']=$rolesPorUsuario[$user['id']]??[];
            $user['last_login_at']=null;
            $user['created_at']=null;
        }
        unset($user);
        send_response(['draw' => $draw, 'recordsTotal' => $total, 'recordsFiltered' => $filtered, 'data' => $users]);
    }

    if ($method === 'POST') {
        $input   = json_decode(file_get_contents('php://input'), true);
        $id      = isset($input['id']) ? (int)$input['id'] : 0;
        $name    = trim($input['name'] ?? '');
        $firstname = trim($input['firstname'] ?? '');
        $lastname  = trim($input['lastname'] ?? '');
        if (empty($firstname) && empty($lastname) && !empty($name)) {
            $parts = explode(' ', $name, 2);
            $firstname = $parts[0] ?? '';
            $lastname = $parts[1] ?? '-';
        }
        $email   = trim($input['email'] ?? '');
        $password= ($input['password'] ?? '');
        if ($password!=='' && strlen($password)<12) throw new DomainException('Utilice 12 caracteres como mínimo.');
        $phone   = trim($input['phone'] ?? '');
        $username= trim($input['username'] ?? '');
        $dob     = trim($input['dob'] ?? '');
        $address = isset($input['address']) && is_array($input['address']) ? json_encode($input['address']) : null;
        $status  = trim($input['status'] ?? 'Activo');
        $roleIds = array_values(array_unique(array_map('intval', $input['roleIds'] ?? array_map(fn($r) => $r['id'] ?? 0, $input['roles'] ?? []))));

        if ($id===$actor && ($status!=='Activo' || !in_array(1,$roleIds,true))) throw new DomainException('Conserve un perfil administrador activo para su propia cuenta.');
        if (!in_array($status,['Activo','Inactivo'],true)) throw new DomainException('Estado de empleado inválido.');
        if ($id>0 && $acceso->consultar("SELECT 1 FROM usuario WHERE idUsu=? AND rolUsu='Cliente'",[$id])->fetchColumn())
            throw new DomainException('La cuenta histórica de Cliente no es un empleado.');
        if (count($roleIds)!==1 || in_array(3,$roleIds,true) || !filter_var($email,FILTER_VALIDATE_EMAIL))
            throw new DomainException('Seleccione exactamente un perfil de personal y un correo válido.');
        if (!$acceso->consultar("SELECT 1 FROM roles WHERE idRol=? AND idRol<>3 AND nombreRol<>'Cliente'",[$roleIds[0]])->fetchColumn())
            throw new DomainException('El perfil seleccionado no existe o no está habilitado para empleados.');
        if (empty($name) || empty($email)) {
            send_response(['success' => false, 'message' => 'Nombre y email son obligatorios'], 400);
        }

        try {
            $pdo->beginTransaction();

            if ($id > 0) {
                // UPDATE existing user
                $updateQuery = "UPDATE usuario SET nombreUsu = ?, apellidoUsu = ?, correoUsu = ?, telefonoUsu = ?, usuarioUsu = ?, fechaNacUsu = ?, direccionUsu = ?, estadoUsu = ?";
                $params = [$firstname, $lastname, $email, $phone, $username, $dob ?: null, $address, $status];

                if (!empty($password)) {
                    $updateQuery .= ", contrasenaUsu = ?";
                    $params[] = Claves::generar($password);
                }

                $updateQuery .= " WHERE idUsu = ?";
                $params[] = $id;

                $stmt = $pdo->prepare($updateQuery);
                $stmt->execute($params);
            } else {
                // CREATE new user
                if (strlen($password)<12) throw new DomainException('La contraseña requiere 12 caracteres.');
                $hashedPw = Claves::generar($password);

                // Generate unique username from email
                $username = $username ?: preg_replace('/[^a-zA-Z0-9_.]/', '', explode('@', $email)[0]);
                $base = $username; $c = 1;
                do {
                    $stmtUsr = $pdo->prepare("SELECT idUsu FROM usuario WHERE usuarioUsu = ?");
                    $stmtUsr->execute([$username]);
                    if ($stmtUsr->fetch()) { $username = $base . $c++; } else break;
                } while (true);

                $cuil = null;
                $stmt = $pdo->prepare("INSERT INTO usuario (nombreUsu, apellidoUsu, correoUsu, usuarioUsu, contrasenaUsu, CUILUsu, telefonoUsu, estadoUsu, rolUsu,fechaNacUsu,direccionUsu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Empleado',?,?)");
                $stmt->execute([$firstname, $lastname, $email, $username, $hashedPw, $cuil,$phone,$status,$dob ?: null,$address]);
                $id = (int)$pdo->lastInsertId();
            }

            $pdo->prepare('DELETE FROM sesiones_pos WHERE idUsu=?')->execute([$id]);
            if ($password!=='') $pdo->prepare('UPDATE usuario SET requiereCambioClave=1 WHERE idUsu=?')->execute([$id]);
            // Sync roles in usuario_rol
            $pdo->prepare("DELETE FROM usuario_rol WHERE idUsu = ?")->execute([$id]);
            $stmtUR = $pdo->prepare("INSERT IGNORE INTO usuario_rol (idUsu, idRol) VALUES (?, ?)");
            $firstRoleName = null;
            foreach ($roleIds as $rid) {
                if ($rid > 0) {
                    $stmtUR->execute([$id, $rid]);
                    if (!$firstRoleName) {
                        $stmtRN = $pdo->prepare("SELECT nombreRol FROM roles WHERE idRol = ?");
                        $stmtRN->execute([$rid]);
                        $firstRoleName = $stmtRN->fetchColumn();
                    }
                }
            }
            // Also update rolUsu column for display
            if ($firstRoleName) {
                $pdo->prepare("UPDATE usuario SET rolUsu = ? WHERE idUsu = ?")->execute([in_array(1,$roleIds,true)?'Administrador':'Empleado', $id]);
            }

            $pdo->commit();
            send_response(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if ($e->getCode() == '23000') {
                send_response(['success' => false, 'message' => 'El email o usuario ya está registrado en el sistema'], 400);
            }
            send_response(['success' => false, 'message' => 'Error al guardar el usuario: ' . $e->getMessage()], 500);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) send_response(['success' => false, 'message' => 'ID no proporcionado'], 400);
        try {
            if ($id===$actor) throw new DomainException('No puede desactivar su propia sesión administrativa.');
            if ($acceso->consultar("SELECT 1 FROM usuario WHERE idUsu=? AND rolUsu='Cliente'",[$id])->fetchColumn())
                throw new DomainException('La cuenta histórica de Cliente no se gestiona como empleado.');
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE usuario SET estadoUsu = 'Inactivo' WHERE idUsu = ?")->execute([$id]);
            $pdo->prepare('DELETE FROM sesiones_pos WHERE idUsu=?')->execute([$id]);
            $pdo->commit();
            send_response(['success' => true]);
        } catch (Exception $e) {
            send_response(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }
}

// 404 Route handler
send_response(["success" => false, "message" => "Ruta no encontrada"], 404);
