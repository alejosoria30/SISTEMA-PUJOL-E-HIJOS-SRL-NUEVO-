CREATE TABLE IF NOT EXISTS categorias_producto (
 idCategoria INT PRIMARY KEY AUTO_INCREMENT,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 activa TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE productos
 ADD COLUMN IF NOT EXISTS idCategoria INT NULL,
 ADD COLUMN IF NOT EXISTS unidadMedida VARCHAR(30) NOT NULL DEFAULT 'unidad',
 ADD COLUMN IF NOT EXISTS codigoBarras VARCHAR(64) NULL,
 ADD COLUMN IF NOT EXISTS archivoImagen VARCHAR(255) NULL,
 ADD UNIQUE INDEX IF NOT EXISTS uq_producto_barras (codigoBarras),
 ADD INDEX IF NOT EXISTS ix_producto_categoria_estado (idCategoria,estadoProd);
SET @ddl_categoria = IF(EXISTS(
 SELECT 1 FROM information_schema.key_column_usage
 WHERE table_schema=DATABASE() AND table_name='productos' AND column_name='idCategoria'
 AND referenced_table_schema=DATABASE() AND referenced_table_name='categorias_producto'
 AND referenced_column_name='idCategoria'
), 'SELECT 1', 'ALTER TABLE productos ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (idCategoria) REFERENCES categorias_producto(idCategoria)');
PREPARE sentencia FROM @ddl_categoria;
EXECUTE sentencia;
DEALLOCATE PREPARE sentencia;
-- DECIMAL(14,3) admite todos los valores previos de INT con signo.
ALTER TABLE inventario
 MODIFY stockActual DECIMAL(14,3) NOT NULL DEFAULT 0,
 MODIFY stockMinimo DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE detalle_venta MODIFY cantidad DECIMAL(14,3) NOT NULL;
ALTER TABLE movimientos_stock MODIFY cantidad DECIMAL(14,3) NOT NULL;
