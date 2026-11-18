-- Inicializa cada módulo una sola vez a partir de su permiso anterior.
-- Las ejecuciones posteriores preservan cambios de perfiles y excepciones.
START TRANSACTION;
CREATE TEMPORARY TABLE IF NOT EXISTS nuevos_modulos_pos (nombre VARCHAR(100) PRIMARY KEY, original VARCHAR(100));
DELETE FROM nuevos_modulos_pos;
INSERT INTO nuevos_modulos_pos
SELECT m.nombre,m.original FROM (
 SELECT 'Catálogo de productos' nombre,'Gestionar Stock' original UNION ALL
 SELECT 'Clasificación de productos','Gestionar Stock' UNION ALL
 SELECT 'Cobros QR','Gestionar Ventas'
) m WHERE NOT EXISTS (SELECT 1 FROM dashboard_permisos p WHERE p.nombreDashPer=m.nombre);
INSERT INTO dashboard_permisos(nombreDashPer) SELECT nombre FROM nuevos_modulos_pos;
INSERT INTO rol_permiso(idRol,idDashPer,puede_ver,puede_crear,puede_modificar,puede_eliminar)
SELECT rp.idRol,n.idDashPer,rp.puede_ver,rp.puede_crear,rp.puede_modificar,rp.puede_eliminar FROM nuevos_modulos_pos m
JOIN dashboard_permisos o ON o.nombreDashPer=m.original JOIN dashboard_permisos n ON n.nombreDashPer=m.nombre JOIN rol_permiso rp ON rp.idDashPer=o.idDashPer;
INSERT INTO usuario_permiso_accion(idUsu,idDashPer,accion,permitido)
SELECT u.idUsu,n.idDashPer,u.accion,u.permitido FROM nuevos_modulos_pos m
JOIN dashboard_permisos o ON o.nombreDashPer=m.original JOIN dashboard_permisos n ON n.nombreDashPer=m.nombre JOIN usuario_permiso_accion u ON u.idDashPer=o.idDashPer;
COMMIT;
DROP TEMPORARY TABLE nuevos_modulos_pos;
