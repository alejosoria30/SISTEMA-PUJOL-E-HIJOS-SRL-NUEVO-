<?php
declare(strict_types=1);

final class OrdenInvalida extends DomainException {}

/** Cliente HTTP de Mercado Pago. No calcula precios ni determina modalidades de venta. */
final class ClienteMercadoPago
{
    public function solicitar(string $ruta, ?array $datos = null, string $token = '', string $clave = ''): array
    {
        // El dominio es fijo: las rutas provienen exclusivamente del backend.
        if ($ruta === '' || $ruta[0] !== '/' || str_starts_with($ruta, '//')
            || preg_match('/[\r\n]/', $ruta)) {
            throw new DomainException('Ruta de Mercado Pago inválida.');
        }
        if (!function_exists('curl_init')) {
            throw new RuntimeException('La extensión cURL de PHP no está disponible.');
        }
        $conexion = curl_init('https://api.mercadopago.com' . $ruta);
        if ($conexion === false) {
            throw new RuntimeException('No se pudo inicializar la conexión con Mercado Pago.');
        }
        $cabeceras = ['Accept: application/json', 'Content-Type: application/json'];
        if ($token !== '') {
            $cabeceras[] = 'Authorization: Bearer ' . $token;
        }
        if ($clave !== '') {
            $cabeceras[] = 'X-Idempotency-Key: ' . $clave;
        }
        $opciones = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 7,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => $cabeceras,
        ];
        if ($datos !== null) {
            $opciones[CURLOPT_POST] = true;
            $opciones[CURLOPT_POSTFIELDS] = json_encode($datos, JSON_THROW_ON_ERROR);
        }
        curl_setopt_array($conexion, $opciones);
        try {
            $respuesta = curl_exec($conexion);
            $codigo = (int)curl_getinfo($conexion, CURLINFO_RESPONSE_CODE);
            $errorCurl = curl_errno($conexion);
        } finally {
            curl_close($conexion);
        }
        if ($respuesta === false || $errorCurl !== 0) {
            throw new DomainException('No se pudo contactar a Mercado Pago. Consulte el estado antes de reintentar.');
        }
        $resultado = json_decode((string)$respuesta, true);
        if ($ruta === '/v1/orders' && in_array($codigo, [400, 422], true)) {
            throw new OrdenInvalida('Mercado Pago rechazó los datos de la orden. Revise la caja y el importe.');
        }
        if ($codigo < 200 || $codigo >= 300 || !is_array($resultado)) {
            throw new DomainException('Mercado Pago no confirmó la operación. Consulte su estado antes de reintentar.');
        }
        return $resultado;
    }
}
