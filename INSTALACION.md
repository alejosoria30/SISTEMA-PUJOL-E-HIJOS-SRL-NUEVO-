# Actualizar Pujol e Hijos en XAMPP

## Instalación existente

1. Guardá una copia de la carpeta actual y una exportación reciente de la base. Detené el servidor Angular y pausá las ventas durante el reemplazo.
2. Extraé el ZIP en una carpeta temporal. Combiná el contenido de Pujol_e_Hijos_SRL con C:\xampp\htdocs\Pujol_e_Hijos_SRL. La ruta final de la API debe ser C:\xampp\htdocs\Pujol_e_Hijos_SRL\api\index.php. Conservá todos los archivos de api\fotos generados desde la fecha del respaldo, las variables de Apache, la llave de cifrado y tus ajustes locales de conexión.
3. Con MariaDB en el puerto 3305, seguí migraciones/LEEME_MIGRACIONES.md en phpMyAdmin. El esquema de partida es el del volcado del 18/11, con la 05 aplicada. La nueva API consulta la configuración del comercio desde el primer acceso.
4. Iniciá Apache y MariaDB. Verificá que PHP 8 tenga habilitadas pdo_mysql, mbstring, gd, curl y sodium, y que Apache permita mod_rewrite y .htaccess. La carpeta api/fotos requiere escritura. Para las fotos de 3 MB, usá post_max_size de al menos 8M.
5. Abrí PowerShell y ejecutá estos comandos. Si ya tenés las dependencias del mismo package-lock.json instaladas, podés pasar directamente a ng serve.

```powershell
cd C:\xampp\htdocs\Pujol_e_Hijos_SRL\admin_metronic_8.2
npm ci --legacy-peer-deps
npx ng serve --port 4200
```

Abrí http://localhost:4200/auth/login con el administrador existente. El acceso del personal está en http://localhost:4200/auth/empleados. Los permisos se vuelven a cargar al iniciar sesión. Apache toma la conexión de PUJOL_DB_HOST, PUJOL_DB_PORT, PUJOL_DB_NAME, PUJOL_DB_USER y PUJOL_DB_PASSWORD. Conservá los valores locales para pujol_e_hijos y puerto 3305.

La carpeta de fuentes incluye el archivo de bloqueo de dependencias. Angular regenera dist al ejecutar npx ng build --configuration production. El ZIP excluye dependencias, cachés y compilaciones reproducibles.

## Mercado Pago Argentina

1. En Mercado Pago Developers creá la aplicación del comercio o integrador, habilitá la integración de QR presencial y OAuth con PKCE. Configurá una URI HTTPS de retorno que termine en `/api/mp/retorno` y un webhook de órdenes que termine en `/api/mp/notificar`. Corresponden a tu URL pública de la API. Un webhook externo requiere una URL accesible desde Internet.
2. Configurá en Apache `PUJOL_MP_CLIENT_ID`, `PUJOL_MP_SECRET` y `PUJOL_MP_REDIRECT_URI` (idéntica a la registrada). Generá `PUJOL_MP_LLAVE` en una consola privada con `php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"`. Guardá una copia protegida de esa llave. Se utiliza para recuperar los tokens almacenados con cifrado autenticado. La pérdida de la llave requiere una nueva vinculación.
3. En **Mercado Pago → Vincular comercio**, autorizá la aplicación desde la cuenta del vendedor. Volvé al sistema, actualizá la pantalla y asociá el **external_pos_id** exacto de una caja QR creada previamente para esa cuenta en Mercado Pago. Utilizá el QR físico de esa caja. Al desvincular, el sistema borra localmente las credenciales. Para revocar también el permiso externo hacelo en la cuenta de Mercado Pago.
4. Abrí un turno, seleccioná productos y elegí **Mercado Pago QR** y su caja. El backend calcula el importe y lo envía a Orders API. El comprador escanea el QR. La operación permanece pendiente hasta que la API consulte a Mercado Pago. En **Ventas → Cobros QR**, «Consultar con Mercado Pago» también permite conciliar una notificación demorada y reintentar una solicitud sin respuesta con la misma clave. Una caja física admite una orden pendiente a la vez.
5. Revisá cuenta, caja, importe, turno y estado con credenciales/compradores de prueba conforme al entorno habilitado por Mercado Pago. Las renovaciones de tokens son automáticas mientras esté vigente el refresh token. Si el proveedor revoca el acceso, volvé a vincular. Los reembolsos se solicitan en Mercado Pago y se consultan desde el POS.

Referencias oficiales: [OAuth](https://www.mercadopago.com.ar/developers/es/docs/security/oauth/creation), [creación de órdenes QR](https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/qr-code/orders/create-order/post), [consulta de órdenes](https://www.mercadopago.com.ar/developers/es/reference/in-person-payments/qr-code/orders/get-order/get) y [notificaciones](https://www.mercadopago.com.ar/developers/es/docs/qr-code/notifications).
