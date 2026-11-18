Para la actualización sobre la base con la migración 05 aplicada, seguí [LEEME_MIGRACIONES.md](LEEME_MIGRACIONES.md). El texto siguiente documenta la versión anterior.

# Pujol e Hijos · Migraciones manuales

Preparadas para la exportación de phpMyAdmin del 17/11/2026 de `pujol_e_hijos`, MariaDB 10.4.32 con InnoDB. Los cinco SQL usan la base seleccionada en phpMyAdmin. El SQL utiliza extensiones de MariaDB para volver a ejecutar los cambios. Si cambiás de motor a MySQL 8, adaptá las cláusulas IF NOT EXISTS de ALTER TABLE antes de importar.

## Orden en phpMyAdmin

1. Exportá la base actual con estructura, datos y disparadores. Guardá también el directorio de imágenes si ya existe. Creá una base de ensayo e importá esa exportación. Revisá cualquier sentencia USE de tu copia antes de importarla.
2. Seleccioná la base de ensayo. En **Importar**, cargá `00_diagnostico.sql`. Guardá el resultado de los conteos y el total histórico. Revisá el nombre de la base, el motor y los roles. El administrador del esquema de origen corresponde a idRol 1.
3. Importá `01_accesos.sql`, `02_catalogo.sql` y `03_cobros.sql`, uno por vez. Esperá la confirmación de cada archivo. Si phpMyAdmin informa un error, revisá ese mensaje antes de seguir. El DDL de MariaDB se confirma por sentencia. Los scripts admiten repetición sobre el esquema de referencia.
4. Importá `04_verificacion.sql`. Los conteos de cuentas, productos, ventas, comprobantes y movimientos de caja, y el total vendido, deben coincidir con el diagnóstico. Las categorías inexistentes deben dar cero. Las ventas históricas sin medio documentado pueden dar un valor mayor que cero.
5. Aplicá el procedimiento de contraseñas del proyecto. Probá el flujo completo en la copia. Para el pase definitivo, reservá una ventana sin operaciones, obtené una exportación nueva y repetí la secuencia sobre la base definitiva junto con el cambio de API. Mantené fuera de servicio la API antigua durante el cambio de claves.

| Archivo | Cambios |
|---|---|
| 00 | Identifica base, versión, motores, roles, permisos y totales de referencia. Solo lectura. |
| 01 | Agrega sesiones con resumen del token, contador de intentos, auditoría y cambio obligatorio de clave. Completa las columnas que las pantallas existentes de roles y empleados ya consultaban. Conserva el permiso de lectura de asociaciones históricas y deja los nuevos permisos de escritura a cero. Recupera la asociación de personal cuando solo figuraba en rolUsu. Las excepciones individuales prevalecen sobre los permisos del rol. |
| 02 | Agrega categorías administrables, unidad, código de barras, archivo de imagen e índices. Amplía cantidades a DECIMAL(14,3). Conserva los códigos existentes. Un producto previo queda inicialmente sin categoría y con unidad «unidad». Revisá la unidad antes de venderlo por peso. |
| 03 | Crea medios de cobro, relación con turno, operador y venta, clave única de operación, reservas, cuentas y cajas MP, estados OAuth, órdenes y reembolsos. Mantiene separada la contabilidad electrónica del efectivo. |
| 04 | Repite controles y verifica relación con categorías, medios de cobro, historial y columnas decimales. Solo lectura. |

El flujo de reserva descuenta disponibilidad al comenzar el QR. Su confirmación consume esa reserva y la cancelación verificada libera las unidades. El reintegro monetario y la devolución física de mercadería se registran por separado. Un reembolso verificado no repone stock automáticamente.

## Compatibilidad y recuperación

El esquema anterior ya admite cuentas, roles básicos, ventas sin cliente, inventario, caja, comprobantes e historial. La exportación ya contiene `movimientos_caja.requestKey` y su índice único. La API actualizada necesita 01 para el acceso, 02 para el catálogo y 03 para las ventas y los indicadores. El acceso requiere los tres cambios antes de habilitar el sitio al personal. Las migraciones solas tampoco cambian el comportamiento del programa anterior.

El archivo `bdPujolScript.sql` del proyecto es solo para instalaciones en una base vacía. Para actualizar una base con operaciones usá exclusivamente los archivos de esta carpeta. La migración conserva los compradores y operaciones previas en sus tablas originales.

Si falla la puesta en marcha, conservá la base intervenida para diagnóstico y restaurá la exportación verificada en otra base. Apuntá el sistema a la copia correspondiente a su versión. Si ya se registraron ventas después del cambio, conciliá esas ventas antes de volver a un respaldo anterior. Los respaldos anteriores al cambio de claves pueden contener texto plano y deben guardarse con acceso restringido.
