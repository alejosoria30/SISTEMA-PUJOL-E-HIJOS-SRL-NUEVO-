# Actualización sobre la base existente

El volcado del 18/11/2026 incluye precioMinorista en productos y tipoVenta en ventas y cobros_pos. Esta entrega parte de ese esquema. La migración 05 ya está aplicada.

1. Exportá una copia de estructura y datos desde phpMyAdmin y respaldá la carpeta del proyecto, incluidas las fotografías actuales y la configuración privada de Apache.
2. Con las ventas detenidas, seleccioná pujol_e_hijos (puerto 3305). Comprobá la selección con SELECT DATABASE(). Anotá el resultado de SELECT COUNT(*), SUM(totalVenta) FROM ventas.
3. En Importar, cargá los siguientes archivos individualmente y en el orden de la tabla. Si aparece un error, conservá el mensaje y revisá esa sentencia antes de continuar. MariaDB confirma las operaciones DDL por sentencia.
4. Compará el conteo y el total de ventas con los valores anteriores. Activá la nueva versión del proyecto después de completar las verificaciones.

| Orden | Archivo | Resultado esperado |
|---|---|---|
| 1 | 06_clasificacion.sql | Subcategorías únicas por categoría. Los productos anteriores conservan su categoría. |
| 2 | 07_minimo_mayorista.sql | Mínimo opcional en productos. Los existentes comienzan con NULL. |
| 3 | 08_arqueo.sql | Un detalle de arqueo por turno cerrado con conteo. |
| 4 | 09_configuracion_cobros.sql | Zona horaria del comercio y fecha de acreditación para operaciones nuevas. |
| 5 | 09b_perfiles.sql | Copia los permisos previos de stock y ventas a los módulos nuevos, incluidas las excepciones. Después se administran individualmente. Requiere permiso para crear tablas temporales. |
| 6 | 10_verificaciones.sql | Solo lectura. Deben aparecer las seis columnas indicadas, los tres permisos y la zona horaria. Los tres contadores de inconsistencias deben devolver cero. |

Los SQL históricos 00–04 y el esquema inicial pertenecen a la instalación original. Para esta actualización usá únicamente la secuencia de esta guía. Ante una reversión coordiná código y base con el respaldo de la misma ventana, preservando cualquier operación posterior.
