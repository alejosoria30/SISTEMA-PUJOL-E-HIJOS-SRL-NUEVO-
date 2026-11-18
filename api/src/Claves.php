<?php
declare(strict_types=1);
final class Claves {
    public static function generar(string $clave): string {
        if ($clave === '' || (!defined('PASSWORD_ARGON2ID') && (strlen($clave)>72 || strpos($clave,chr(0))!==false))) {
            throw new RuntimeException('La clave requiere restablecimiento individual.');
        }
        $hash = password_hash($clave, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT);
        if (!$hash) throw new RuntimeException('Error al generar el hash.');
        return $hash;
    }
}
