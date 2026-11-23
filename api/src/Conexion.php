<?php
declare(strict_types=1);
final class Conexion {
    public static function abrir(): PDO {
        $nombre = getenv('PUJOL_DB_NAME');
        $usuario = getenv('PUJOL_DB_USER');
        if (!$nombre || !$usuario || !preg_match('/^[a-zA-Z0-9_]+$/D', $nombre)) {
            throw new RuntimeException('Configure la conexión del comercio.');
        }
        $host = getenv('PUJOL_DB_HOST') ?: '127.0.0.1';
        $puerto=(int)(getenv('PUJOL_DB_PORT') ?: 3305);
        $db = new PDO("mysql:host=$host;port=$puerto;dbname=$nombre;charset=utf8mb4", $usuario,
            (string)getenv('PUJOL_DB_PASSWORD'), [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
        $zona=$db->query('SELECT zonaHoraria FROM configuracion_comercio WHERE id=1')->fetchColumn();
        $ahora=new DateTimeImmutable('now',new DateTimeZone($zona));
        $db->prepare('SET SESSION time_zone=?')->execute([$ahora->format('P')]);
        return $db;
    }
}
