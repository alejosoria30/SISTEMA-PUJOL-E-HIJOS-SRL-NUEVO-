<?php
declare(strict_types=1);

/** Registro transaccional de ventas presenciales. Los precios se calculan en MySQL. */
final class Ventas
{
    public static function registrar(PDO $db, int $usuario, array $datos): int
    {
        $medio = (string)($datos['medio'] ?? '');
        $clave = (string)($datos['claveOperacion'] ?? '');
        // La versión anterior solo enviaba medio y detalles: se conserva como mayorista.
        $tipoVenta = (string)($datos['tipoVenta'] ?? 'mayorista');
        if (!in_array($medio, ['efectivo', 'transferencia', 'transferencia_bancaria'], true)
            || !in_array($tipoVenta, ['mayorista', 'minorista'], true)
            || !preg_match('/^[a-f0-9-]{36}$/D', $clave)) {
            throw new DomainException('Medio, modalidad o identificador de operación inválido.');
        }

        // Los pagos no integrados se registran solo cuando el cajero declara
        // que comprobó la acreditación en la cuenta del comercio.
        // Esto NO es verificación automática del banco o de la billetera.
        if (in_array($medio, ['transferencia', 'transferencia_bancaria'], true)
            && ($datos['acreditacionConfirmada'] ?? null) !== true) {
            throw new DomainException('Confirme la acreditación antes de registrar la transferencia.');
        }

        $items = [];
        if (!is_array($datos['details'] ?? null)) {
            throw new DomainException('El carrito no tiene un formato válido.');
        }
        foreach ($datos['details'] as $detalle) {
            if (!is_array($detalle)) {
                throw new DomainException('Revise los artículos del carrito.');
            }
            $id = filter_var($detalle['productId'] ?? 0, FILTER_VALIDATE_INT);
            $cantidad = (string)($detalle['quantity'] ?? '');
            if (!$id || $id <= 0 || isset($items[$id])
                || !preg_match('/^\d{1,8}(?:\.\d{1,3})?$/D', $cantidad)
                || (float)$cantidad <= 0) {
                throw new DomainException('Revise las cantidades del carrito.');
            }
            $items[$id] = number_format((float)$cantidad, 3, '.', '');
        }
        if (!$items) {
            throw new DomainException('El carrito está vacío.');
        }
        ksort($items);

        // Evita que la misma clave se reutilice con otra modalidad o carrito.
        $huella = hash('sha256', json_encode([$medio, $tipoVenta, $items], JSON_THROW_ON_ERROR));
        $db->beginTransaction();
        try {
            $consulta = $db->prepare(
                'SELECT idVenta,idUsu,huellaSolicitud FROM cobros_pos WHERE claveOperacion=? FOR UPDATE'
            );
            $consulta->execute([$clave]);
            $previo = $consulta->fetch();
            if ($previo) {
                if ((int)$previo['idUsu'] !== $usuario || !hash_equals($previo['huellaSolicitud'], $huella)
                    || $previo['idVenta'] === null) {
                    throw new DomainException('La clave identifica otra operación o un cobro pendiente.');
                }
                $db->commit();
                return (int)$previo['idVenta'];
            }

            $turno = $db->query(
                "SELECT idTurno FROM caja_turnos WHERE estadoTurno='Abierto' ORDER BY idTurno LIMIT 1 FOR UPDATE"
            )->fetchColumn();
            if (!$turno) {
                throw new DomainException('Abra un turno de caja.');
            }
            $db->prepare(
                "INSERT INTO ventas(totalVenta,idUsu,estadoVenta,tipoVenta) VALUES(0,?,'Completada',?)"
            )->execute([$usuario, $tipoVenta]);
            $idVenta = (int)$db->lastInsertId();

            foreach ($items as $idProducto => $cantidad) {
                $consulta = $db->prepare(
                    "SELECT p.nombreProd, p.minimoMayorista, p.precioUnitario, p.precioMinorista, p.unidadMedida "
                    . "FROM inventario i JOIN productos p ON p.idProd=i.idProd "
                    . "WHERE i.idProd=? AND p.estadoProd='Activo' AND i.stockActual>=? FOR UPDATE"
                );
                $consulta->execute([$idProducto, $cantidad]);
                $producto = $consulta->fetch();
                if (!$producto) {
                    throw new DomainException('Un producto ya no está disponible en esa cantidad.');
                }
                if (in_array($producto['unidadMedida'], ['unidad', 'paquete', 'caja'], true)
                    && floor((float)$cantidad) !== (float)$cantidad) {
                    throw new DomainException('La presentación requiere cantidades enteras.');
                }
                ReglaMayorista::verificar($tipoVenta, $cantidad, $producto);
                $precio = $tipoVenta === 'minorista'
                    ? $producto['precioMinorista']
                    : $producto['precioUnitario'];
                if ($precio === null || (float)$precio <= 0) {
                    throw new DomainException('Configure el precio ' . $tipoVenta . ' del producto antes de venderlo.');
                }
                $db->prepare(
                    'INSERT INTO detalle_venta(idVenta,idProd,cantidad,precioUnitario,subtotal) '
                    . 'VALUES(?,?,?,?,ROUND(CAST(? AS DECIMAL(14,3))*CAST(? AS DECIMAL(10,2)),2))'
                )->execute([$idVenta, $idProducto, $cantidad, $precio, $cantidad, $precio]);
                $db->prepare('UPDATE inventario SET stockActual=stockActual-? WHERE idProd=?')
                    ->execute([$cantidad, $idProducto]);
                $db->prepare(
                    "INSERT INTO movimientos_stock(idProd,tipoMovimiento,cantidad,idUsu,observaciones) "
                    . "VALUES(?,'Salida',?,?,?)"
                )->execute([$idProducto, $cantidad, $usuario, 'Venta #'.$idVenta.' - '.$tipoVenta]);
            }

            $consulta = $db->prepare('SELECT SUM(subtotal) FROM detalle_venta WHERE idVenta=?');
            $consulta->execute([$idVenta]);
            $importe = $consulta->fetchColumn();
            if ($importe === null || (float)$importe <= 0 || (float)$importe > 99999999.99) {
                throw new DomainException('El importe total de la venta no es válido.');
            }
            $db->prepare('UPDATE ventas SET totalVenta=? WHERE idVenta=?')->execute([$importe, $idVenta]);
            $db->prepare(
                "INSERT INTO cobros_pos(claveOperacion,huellaSolicitud,idVenta,idUsu,idTurno,medio,importe,estado,tipoVenta,fechaAcreditacion) "
                . "VALUES(?,?,?,?,?,?,?,'aprobado',?,CURRENT_TIMESTAMP)"
            )->execute([$clave, $huella, $idVenta, $usuario, $turno, $medio, $importe, $tipoVenta]);

            if ($medio === 'efectivo') {
                $db->prepare(
                    "INSERT INTO movimientos_caja(idTurno,tipoMovimiento,concepto,monto,idUsu,idVenta) "
                    . "VALUES(?,'Ingreso',?,?,?,?)"
                )->execute([$turno, 'Venta #'.$idVenta, $importe, $usuario, $idVenta]);
            }
            $db->commit();
            return $idVenta;
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
    }
}
