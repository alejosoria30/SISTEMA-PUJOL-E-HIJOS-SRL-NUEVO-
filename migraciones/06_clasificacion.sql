CREATE TABLE IF NOT EXISTS subcategorias_producto (
 idSubcategoria INT AUTO_INCREMENT PRIMARY KEY,
 idCategoria INT NOT NULL,
 nombre VARCHAR(100) NOT NULL,
 activa TINYINT(1) NOT NULL DEFAULT 1,
 UNIQUE (idCategoria,nombre),
 FOREIGN KEY (idCategoria) REFERENCES categorias_producto(idCategoria)
) ENGINE=InnoDB;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS idSubcategoria INT NULL;
SET @ddl_subcategoria = IF(EXISTS(
 SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE()
 AND TABLE_NAME='productos' AND COLUMN_NAME='idSubcategoria' AND REFERENCED_TABLE_NAME='subcategorias_producto'),
 'SELECT 1','ALTER TABLE productos ADD CONSTRAINT fk_producto_subcategoria FOREIGN KEY (idSubcategoria) REFERENCES subcategorias_producto(idSubcategoria)');
PREPARE ddl FROM @ddl_subcategoria;
EXECUTE ddl;
DEALLOCATE PREPARE ddl;
