<?php
declare(strict_types=1);

final class Arqueo
{
    public static function total(array $datos): float
    {
        $billetes = $datos['billetes'] ?? null;
        $otros = (string)($datos['otros'] ?? '0');
        if (!is_array($billetes) || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D', $otros)
            || mb_strlen($datos['observaciones'] ?? '') > 500) {
            throw new DomainException('Revise el efectivo adicional y las observaciones del cierre.');
        }
        $total = (float)$otros;
        foreach ($billetes as $valor => $cantidad) {
            if (!in_array($valor, [100,200,500,1000,2000,10000,20000], true)
                || !is_int($cantidad) || $cantidad < 0) {
                throw new DomainException('Cada denominación requiere una cantidad entera no negativa.');
            }
            $total += $valor * $cantidad;
        }
        if ($total > 99999999.99) throw new DomainException('El efectivo contado supera el límite de caja.');
        return round($total, 2);
    }
}
