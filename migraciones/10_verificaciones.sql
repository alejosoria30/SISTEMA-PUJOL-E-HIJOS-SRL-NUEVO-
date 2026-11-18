-- Solo lectura. Seleccionar previamente pujol_e_hijos.
SELECT DATABASE() AS base_actual, VERSION() AS motor;
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='productos' AND COLUMN_NAME IN ('minimoMayorista','precioMinorista','idSubcategoria')) OR (TABLE_NAME='cobros_pos' AND COLUMN_NAME IN ('fechaAcreditacion','tipoVenta')) OR (TABLE_NAME='ventas' AND COLUMN_NAME='tipoVenta'));
SELECT nombreDashPer FROM dashboard_permisos WHERE nombreDashPer IN ('Catálogo de productos','Clasificación de productos','Cobros QR');
SELECT COUNT(*) AS clasificaciones_inconsistentes FROM productos p LEFT JOIN subcategorias_producto s ON s.idSubcategoria=p.idSubcategoria
WHERE p.idSubcategoria IS NOT NULL AND (s.idSubcategoria IS NULL OR NOT (p.idCategoria <=> s.idCategoria));
SELECT COUNT(*) AS minimos_invalidos FROM productos WHERE minimoMayorista<=0;
SELECT COUNT(*) AS arqueos_sin_turno_cerrado FROM arqueos_pos a LEFT JOIN caja_turnos t USING(idTurno) WHERE t.idTurno IS NULL OR t.estadoTurno<>'Cerrado';
SELECT zonaHoraria FROM configuracion_comercio WHERE id=1;
SELECT COUNT(*) AS ventas, COALESCE(SUM(totalVenta),0) AS importe_historico FROM ventas;
