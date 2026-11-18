# Pujol e Hijos · Actualización del 18/11/2026

## Uso del mínimo

En Catálogo, editá el producto y completá Cantidad mínima mayorista. Para seis botellas vendidas por unidad, ingresá 6. Para un artículo inventariado por caja, ingresá 1 si una caja ya habilita su precio mayorista. Los productos a granel admiten hasta tres decimales. El campo vacío conserva la política anterior. El mínimo se compara con la cantidad acumulada del mismo producto, independientemente de cómo se agregó al carrito. En una venta mayorista todas las líneas deben cumplir su condición. El operador puede completar la cantidad o cambiar la modalidad de toda la operación. Una venta minorista continúa usando el precio minorista incluso cuando se alcanza el mínimo.

## Administración

El menú agrupa operaciones, inventario, caja y administración. Las subcategorías tienen una categoría principal y admiten baja lógica. Los permisos efectivos combinan los perfiles asignados. La excepción individual Permitir o Denegar prevalece en su módulo y acción. Heredar elimina esa excepción. La alta de empleados, los cambios de acceso, la configuración del comercio y la vinculación de Mercado Pago corresponden al administrador.

Caja calcula el efectivo esperado a partir del fondo y los movimientos físicos del turno. Guarda billetes, otros importes, observaciones y responsable. El historial anterior sigue disponible. El dashboard muestra ventas completadas del período y el stock al momento de consulta. El gráfico de categorías usa la clasificación actual del producto. El gráfico de medios muestra los cobros aprobados netos de devoluciones conocidas, agrupados por fecha de acreditación local o, para cobros históricos sin esa fecha, por fecha de venta. La acreditación local registra cuándo se confirmó en el sistema. Los controles de períodos usan la zona configurada y presuponen que las fechas históricas DATETIME están expresadas en la hora local del comercio.

## Validaciones ejecutadas

Compilación de desarrollo y de producción con Angular 16, comprobación TypeScript 4.9.5 y análisis de sintaxis de todos los PHP de api y herramientas. En producción el paquete inicial fue de 2,61 MB, por encima del objetivo de aviso de 2 MB y por debajo del límite de error de 5 MB.

Se ejecutaron 13 casos PHP de mínimo y arqueo, incluidos cinco, seis y siete unidades, umbral decimal, ausencia de mínimo, modalidad minorista, conteo de $88.000, monedas, valores negativos, fraccionarios, desconocidos y exceso de monto. En el componente de caja de ventas se verificó que cinco unidades advierten el faltante, agregar una sexta habilita el total mayorista, cambiar de modalidad conserva el carrito y un precio ausente o stock insuficiente impiden el cobro.

## Validación pendiente en instalación local

Las migraciones se entregan para importación manual. La instancia MariaDB aislada de prueba no pudo abrir su socket en el entorno de ejecución. Quedan pendientes las operaciones completas contra MariaDB 10.4 y XAMPP, las pruebas visuales en claro y oscuro, la carga de fotografías con GD y el circuito OAuth, QR, notificación y reembolso con una cuenta habilitada.

En una copia local, verificá estas operaciones antes del uso comercial.

1. Creá una categoría y una subcategoría, cargá una foto, configurá ambos precios y comprobá los filtros. Desactivá una subcategoría y revisá sus asociaciones previas.
2. Con un producto de prueba, registrá una venta por efectivo y otra por transferencia. Verificá modalidad, precio unitario, total, disminución del stock y comprobante. El efectivo debe impactar una sola vez en caja.
3. Probá un empleado con perfil de cajero, denegá una acción individual y verificá el acceso. Cambiá a Heredar y comprobá la actividad registrada. Desactivá el empleado y verificá su sesión.
4. Abrí un turno, registrá ingresos y egresos, cerrá con conteo y revisá el detalle en Historial de caja. Comprobá la diferencia y que el segundo cierre se rechace.
5. Contrastá cada período del panel con ventas y cobros, incluyendo un rango vacío. El stock y el turno corresponden al estado actual.
6. Vinculá la cuenta de prueba habilitada y una caja con external_pos_id. Verificá el importe en la aplicación del comprador y conciliá una orden según el estado informado por el proveedor. Conservá las credenciales y llave de cifrado existentes.

La integración asocia el importe a una orden QR estática de la caja usando la Orders API. La validación de la caja usa la búsqueda POS del vendedor autenticado. Referencias oficiales de Mercado Pago Argentina.

- https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/point/pos/search-pos/get
- https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/qr-code/orders/create-order/post
- https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/qr-code/orders/get-order/get

## Archivos de la aplicación

| Archivo | Cambio |
|---|---|
| `api/src/Arqueo.php` | Valida denominaciones y calcula el efectivo en servidor. |
| `api/src/PanelComercial.php` | Consultas e indicadores para cada rango. |
| `api/src/ReglaMayorista.php` | Comprueba el umbral por producto. |
| `admin_metronic_8.2/src/app/_fake/services/user-service.ts` | Evita asignar la fecha actual a altas históricas sin fecha. |
| `admin_metronic_8.2/src/app/_metronic/layout/components/sidebar/sidebar-menu/sidebar-menu.component.html` | Agrupación y navegación según acceso. |
| `admin_metronic_8.2/src/app/modules/auth/services/auth.service.ts` | Permisos para catálogo, clasificación y cobros QR. |
| `admin_metronic_8.2/src/app/pages/administracion-pos.component.ts` | Administración de subcategorías, excepciones, actividad, cajas y zona. |
| `admin_metronic_8.2/src/app/pages/caja/caja.component.html` | Conteo por billete, diferencias, cierre e historial. |
| `admin_metronic_8.2/src/app/pages/caja/caja.component.ts` | Conteo por billete, diferencias, cierre e historial. |
| `admin_metronic_8.2/src/app/pages/catalogo/catalogo.component.html` | Clasificación, mínimo, búsqueda y filtros. |
| `admin_metronic_8.2/src/app/pages/catalogo/catalogo.component.ts` | Clasificación, mínimo, búsqueda y filtros. |
| `admin_metronic_8.2/src/app/pages/comprobantes/comprobantes.component.html` | Modalidad de la venta en lista y ticket. |
| `admin_metronic_8.2/src/app/pages/dashboard/dashboard.component.html` | Indicadores, filtros y gráficos del comercio. |
| `admin_metronic_8.2/src/app/pages/dashboard/dashboard.component.ts` | Indicadores, filtros y gráficos del comercio. |
| `admin_metronic_8.2/src/app/pages/dashboard/dashboard.module.ts` | Indicadores, filtros y gráficos del comercio. |
| `admin_metronic_8.2/src/app/pages/historial-ventas/historial-ventas.component.html` | Modalidad, estado documentado y pesos argentinos. |
| `admin_metronic_8.2/src/app/pages/historial-ventas/historial-ventas.component.ts` | Modalidad, estado documentado y pesos argentinos. |
| `admin_metronic_8.2/src/app/pages/routing.ts` | Rutas protegidas y accesos a historial y movimientos. |
| `admin_metronic_8.2/src/app/pages/state.service.ts` | Tipos del catálogo, carga según acceso y cierre con conteo. |
| `admin_metronic_8.2/src/app/pages/stock/stock.component.ts` | Apertura directa de la pestaña de movimientos. |
| `admin_metronic_8.2/src/app/pages/user/user-details/user-details.component.html` | Ficha de empleado con datos de la API y enlace a sus accesos. |
| `admin_metronic_8.2/src/app/pages/user/user-listing/user-listing.component.ts` | Muestra la ausencia de fechas documentadas. |
| `admin_metronic_8.2/src/app/pages/ventas/ventas.component.html` | Umbral por cantidad acumulada y disponibilidad del medio QR. |
| `admin_metronic_8.2/src/app/pages/ventas/ventas.component.ts` | Umbral por cantidad acumulada y disponibilidad del medio QR. |
| `api/index.php` | Rutas, permisos, arqueo, actividad, configuración y comprobantes. |
| `api/src/Acceso.php` | Expone excepciones explícitas junto al permiso efectivo. |
| `api/src/Catalogo.php` | Valida y persiste clasificación y mínimo. |
| `api/src/Conexion.php` | Configura la hora de sesión de MariaDB. |
| `api/src/MercadoPago.php` | Verifica cajas remotas, mínimo de venta y acreditación. |
| `api/src/Ventas.php` | Valida el mínimo bajo bloqueo y registra acreditación. |

El orden de los SQL y las comprobaciones figuran en migraciones/LEEME_MIGRACIONES.md. INSTALACION.md corresponde a la actualización de la instalación existente.
