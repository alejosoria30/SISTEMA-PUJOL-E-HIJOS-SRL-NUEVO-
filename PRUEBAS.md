# Resultados de verificación

El proyecto conserva la aplicación Angular y la API PHP de origen. Se reemplazó la autenticación y se separaron clases para conexión, claves, sesiones, catálogo, ventas y comunicación con Mercado Pago. El catálogo anterior ignoraba las fotos en sus consultas de lectura y escritura y deducía las categorías del nombre. El POS aceptaba el total y operador del navegador, permitía vender en negativo y contabilizaba todas las ventas como efectivo. La actualización corrige esos flujos.

| Verificación | Resultado |
|---|---|
| Compilación Angular de producción | Completada con el package-lock del proyecto. Advertencia de tamaño del paquete inicial de aproximadamente 2,61 MB frente al objetivo de 2 MB. |
| Sintaxis de PHP | Validación CLI de los archivos de la API y herramientas. PHP 8.4.27 en el entorno de ensayo. |
| Migraciones | Se probaron sobre MariaDB 11.8.6 con el esquema de la exportación de MariaDB 10.4.32 y registros ficticios. Dos pasadas consecutivas. Se conservaron 23 unidades de inventario y quedaron tres medios de cobro. La versión exacta de XAMPP requiere la comprobación local indicada en la guía. |
| Migración de clave previa | Un registro de ensayo pendiente, uno convertido y cero conversiones al repetir. El login nuevo exige cambiar la clave temporal. |
| Autenticación y permisos | Respuestas HTTP comprobadas para petición anónima, cambio obligatorio, sesión válida, logout e intento con token revocado. Un empleado pudo consultar productos y recibió acceso denegado al guardar productos, crear categorías o listar usuarios. |
| Catálogo e imágenes | Alta de categoría y producto, subida y reemplazo de PNG, JPEG y WebP, eliminación de la foto y rechazo de archivo inválido. |
| Efectivo y transferencia | Apertura con 100. Venta de 1,5 kg a 125 por kg. El servidor registró 187,50 aunque el navegador envió un precio y total distintos. Reintentar la venta devolvió su identificador sin otro descuento de stock. Se rechazó una cantidad superior a la disponible. Una segunda venta por transferencia dejó el total de ingresos físicos en 187,50. Se emitió el ticket de la venta. |
| QR sin credenciales | La configuración devolvió un error explícito. No se inició ningún cobro real. |
| QR con proveedor de prueba local | Se verificó OAuth con estado de un solo uso, almacenamiento de credenciales cifradas, reserva, reintento, confirmación, reembolso y expiración. La confirmación repetida no duplicó la venta ni disminuyó dos veces la disponibilidad. La expiración repetida liberó una sola reserva. La venta QR no generó ingreso físico. |
| Prueba de interfaz en navegador | Chromium no pudo iniciarse porque el entorno bloqueó la creación de su socket local. La compilación verificó las plantillas Angular. Queda pendiente la prueba visual de extremo a extremo en Windows. |
| Integración externa | Pendiente la operación con aplicación OAuth real de prueba, caja registrada, QR físico y entrega HTTPS de un webhook de Mercado Pago. Las pruebas locales de respuesta del proveedor no sustituyen esa comprobación. |

Los comprobantes mantienen la numeración interna de la aplicación. El proyecto no incluye emisión fiscal conectada a ARCA. Las ventas previas sin medio documentado figuran con esa indicación. Para comprobar el circuito en XAMPP, seguí INSTALACION.md y la guía de migraciones antes de sustituir el proyecto que usa el comercio.
