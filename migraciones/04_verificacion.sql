-- Solo lectura. Seleccionar en phpMyAdmin la copia de la base exportada.
SELECT DATABASE() AS base_seleccionada, VERSION() AS version_servidor;
SELECT table_name, engine FROM information_schema.tables
WHERE table_schema = DATABASE() ORDER BY table_name;
SELECT (SELECT COUNT(*) FROM usuario) AS cuentas,
       (SELECT COUNT(*) FROM productos) AS productos,
       (SELECT COUNT(*) FROM ventas) AS ventas,
       (SELECT COUNT(*) FROM comprobantes) AS comprobantes,
       (SELECT COUNT(*) FROM movimientos_caja) AS movimientos_caja,
       (SELECT COALESCE(SUM(totalVenta),0) FROM ventas) AS total_historico;
SELECT idRol, nombreRol FROM roles ORDER BY idRol;
SELECT idDashPer, nombreDashPer FROM dashboard_permisos ORDER BY idDashPer;
SELECT COUNT(*) AS productos_con_categoria_inexistente
 FROM productos p LEFT JOIN categorias_producto c ON c.idCategoria=p.idCategoria
 WHERE p.idCategoria IS NOT NULL AND c.idCategoria IS NULL;
SELECT COUNT(*) AS ventas_sin_medio_documentado FROM ventas v
 LEFT JOIN cobros_pos c ON c.idVenta=v.idVenta WHERE c.idCobro IS NULL;
SELECT codigo, esEfectivo, activo FROM medios_cobro ORDER BY codigo;
SELECT table_name,column_name,column_type FROM information_schema.columns
 WHERE table_schema=DATABASE() AND
 ((table_name='inventario' AND column_name IN ('stockMinimo','stockActual'))
 OR (table_name IN ('detalle_venta','movimientos_stock') AND column_name='cantidad'));
