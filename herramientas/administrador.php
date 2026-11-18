<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
require __DIR__.'/../api/src/Conexion.php';
require __DIR__.'/../api/src/Claves.php';
$db=Conexion::abrir();
$correo=$argv[1]??'';
if (!filter_var($correo,FILTER_VALIDATE_EMAIL)) exit("Uso: php administrador.php correo\n");
$clave=bin2hex(random_bytes(16));
$db->beginTransaction();
try {
    $rol=$db->query("SELECT idRol FROM roles WHERE idRol=1 AND nombreRol='Administrador' FOR UPDATE")->fetchColumn();
    if (!$rol) throw new RuntimeException('Revise el rol administrador.');
    $q=$db->prepare('SELECT idUsu FROM usuario WHERE correoUsu=? FOR UPDATE');$q->execute([$correo]);$id=$q->fetchColumn();
    if ($id) {
        $q=$db->prepare('SELECT 1 FROM usuario_rol WHERE idUsu=? AND idRol=1');$q->execute([$id]);
        if (!$q->fetchColumn()) throw new RuntimeException('Esta cuenta pertenece a otro perfil.');
        $db->prepare('UPDATE usuario SET contrasenaUsu=?,requiereCambioClave=1 WHERE idUsu=?')->execute([Claves::generar($clave),$id]);
        $db->prepare('DELETE FROM sesiones_pos WHERE idUsu=?')->execute([$id]);
    } else {
        $db->prepare("INSERT INTO usuario(nombreUsu,apellidoUsu,usuarioUsu,correoUsu,contrasenaUsu,rolUsu,requiereCambioClave) VALUES('Administrador','',?,?,?,'Administrador',1)")->execute([substr(explode('@',$correo)[0],0,50),$correo,Claves::generar($clave)]);
        $db->prepare('INSERT INTO usuario_rol VALUES(?,1)')->execute([$db->lastInsertId()]);
    }
    $db->commit();echo "Clave temporal de un solo acceso: ".$clave.PHP_EOL;
} catch(Throwable $e){ $db->rollBack(); fwrite(STDERR,"No se pudo configurar el administrador.\n"); exit(1);}
