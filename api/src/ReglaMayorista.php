<?php
declare(strict_types=1);

final class ReglaMayorista
{
    public static function verificar(string $modalidad, string $cantidad, array $producto): void
    {
        $minimo = $producto['minimoMayorista'];
        if ($modalidad === 'mayorista' && $minimo !== null && (float)$cantidad < (float)$minimo) {
            throw new DomainException(sprintf('«%s» requiere al menos %s (%s) para la venta mayorista.',
                $producto['nombreProd'], $minimo, $producto['unidadMedida']));
        }
    }
}
