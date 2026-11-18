-- Configuración inicial de permisos operativos para el perfil Empleado (idRol = 2).
-- Pujol e Hijos S.R.L. · Distribuidora Mayorista de Bebidas
-- Asigna acceso a ventas, caja presencial, inventario, catálogo y comprobantes.
-- Mantiene restringidos Gestión de Roles (7) y Clasificación de productos (13) para Administrador (1).

INSERT INTO rol_permiso (idRol, idDashPer, puede_ver, puede_crear, puede_modificar, puede_eliminar)
VALUES
  (2, 1, 1, 0, 0, 0),  -- Acceder al Dashboard
  (2, 2, 1, 1, 1, 0),  -- Gestionar Stock
  (2, 5, 1, 1, 0, 0),  -- Gestionar Ventas
  (2, 8, 1, 0, 0, 0),  -- Ver Historial de Ventas
  (2, 9, 1, 0, 1, 0),  -- Modificar Mi Perfil
  (2, 10, 1, 1, 1, 0), -- Caja presencial
  (2, 11, 1, 1, 0, 0), -- Comprobantes presenciales
  (2, 12, 1, 0, 0, 0), -- Catálogo de productos
  (2, 14, 1, 1, 0, 0), -- Cobros QR
  (2, 15, 1, 0, 1, 0), -- Ajustar cantidad de stock
  (2, 16, 1, 0, 0, 0), -- Ver movimientos de stock
  (2, 17, 1, 1, 0, 0), -- Registrar entradas de stock
  (2, 18, 1, 1, 0, 0), -- Registrar salidas de stock
  (2, 19, 1, 0, 0, 0)  -- Ver historial de caja
ON DUPLICATE KEY UPDATE
  puede_ver = VALUES(puede_ver),
  puede_crear = VALUES(puede_crear),
  puede_modificar = VALUES(puede_modificar),
  puede_eliminar = VALUES(puede_eliminar);
