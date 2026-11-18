<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404); exit;}
require __DIR__.'/../api/src/Conexion.php';
require __DIR__.'/../api/src/Claves.php';
$aplicar = ($argv[1] ?? '')==='--aplicar';
$db=Conexion::abrir();
try {
    $db->beginTransaction();
    $filas=$db->query('SELECT idUsu,contrasenaUsu FROM usuario ORDER BY idUsu'.($aplicar?' FOR UPDATE':''))->fetchAll();
    $actualizar=$db->prepare('UPDATE usuario SET contrasenaUsu=?, requiereCambioClave=1 WHERE idUsu=?');
    $pendientes=0;
    foreach ($filas as $fila) {
        $valor=$fila['contrasenaUsu'];
        if (password_get_info($valor)['algoName']!=='unknown') continue;
        if ($valor==='' || preg_match('/^\$(2[aby]|argon2i[d]?)\$/',$valor)) {
            throw new RuntimeException('Revisar la credencial de la cuenta '.(int)$fila['idUsu'].'.');
        }
        $pendientes++;
        if ($aplicar) $actualizar->execute([Claves::generar($valor),$fila['idUsu']]);
    }
    $db->commit();
    echo ($aplicar?'Claves migradas: ':'Claves pendientes: ').$pendientes.PHP_EOL;
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    fwrite(STDERR,"Se canceló la migración. ".($e instanceof PDOException?'Revise la conexión y el esquema.':$e->getMessage()).PHP_EOL);
    exit(1);
}
