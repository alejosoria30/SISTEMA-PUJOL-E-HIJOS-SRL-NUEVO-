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
