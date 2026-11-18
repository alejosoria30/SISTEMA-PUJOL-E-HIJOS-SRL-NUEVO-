<?php
declare(strict_types=1);
final class Conexion {
    public static function abrir(): PDO {
        $nombre = getenv('PUJOL_DB_NAME') ?: 'pujol_e_hijos';
        $usuario = getenv('PUJOL_DB_USER') ?: 'root';
        $password = getenv('PUJOL_DB_PASSWORD') !== false ? (string)getenv('PUJOL_DB_PASSWORD') : '';
        $host = getenv('PUJOL_DB_HOST') ?: '127.0.0.1';
        $specifiedPort = getenv('PUJOL_DB_PORT') ? (int)getenv('PUJOL_DB_PORT') : null;
        $ports = $specifiedPort ? [$specifiedPort] : [3305, 3307, 3306];

        $db = null;
        $lastException = null;
        foreach ($ports as $puerto) {
            try {
                $db = new PDO("mysql:host=$host;port=$puerto;dbname=$nombre;charset=utf8mb4", $usuario, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
                break;
            } catch (PDOException $e) {
                $lastException = $e;
            }
        }

        if (!$db) {
            throw $lastException ?? new RuntimeException('No se pudo conectar a la base de datos.');
        }

        try {
            $zona = $db->query('SELECT zonaHoraria FROM configuracion_comercio WHERE id=1')->fetchColumn() ?: 'America/Argentina/Buenos_Aires';
            $ahora = new DateTimeImmutable('now', new DateTimeZone($zona));
            $db->prepare('SET SESSION time_zone=?')->execute([$ahora->format('P')]);
        } catch (Exception $e) {
            // Ignore if configuracion_comercio not initialized yet
        }

        return $db;
    }
}
