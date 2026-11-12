# AUDITORÍA TÉCNICA Y DIAGNÓSTICO DE ARQUITECTURA
## SISTEMA DE GESTIÓN INTEGRAL "PUJOL E HIJOS S.R.L."
**Distribuidora Mayorista de Bebidas (No Alcohólicas) — Formosa, Argentina**

---

### 1. OBJETIVO DEL DOCUMENTO Y ANÁLISIS PREVIO AL MODELADO UML

Este documento responde a los requerimientos de la cátedra y a las observaciones críticas planteadas en exámenes anteriores respecto a la **concordancia absoluta e incontrastable entre los Requerimientos Funcionales, los Diagramas de Casos de Uso UML 2.x, el Código Fuente real, las Rutas, los Controladores/Despachadores, los Métodos y la Base de Datos MySQL**.

---

### 2. AUDITORÍA DEL STACK REAL VS. OBSERVACIÓN SOBRE "LARAVEL" EN EL EXAMEN

> **OBSERVACIÓN CLAVE DE LA AUDITORÍA DE CÓDIGO FUENTE:**
> 
> Durante la revisión exhaustiva de todo el repositorio (`c:\xampp\htdocs\Pujol_e_Hijos_SRL`), se determinó lo siguiente:
> 
> 1. **Arquitectura Real Implementada:**
>    - **Frontend:** Single Page Application (SPA) en **Angular 16+** estructurada sobre el template corporativo Metronic 8.2 (`admin_metronic_8.2/`).
>    - **Backend:** Micro-API REST monolítica basada en **PHP Nativo con PDO y JWT**, estructurada bajo el patrón de diseño **Front Controller** en el archivo único `api/index.php`.
>    - **Base de Datos:** **MySQL** relacional normalizada (`bdPujolScript.sql`).
> 
> 2. **¿Existe Laravel o `RegisteredUserController` en este proyecto?**
>    - **No.** No existen dependencias de Laravel (`composer.json` con `laravel/framework`, `artisan`, etc.) en el backend.
>    - En consecuencia, **no existe la clase `RegisteredUserController` de Laravel Breeze / Jetstream / Fortify**.
>    - El registro de usuarios (`POST /auth/register`) fue **desarrollado íntegramente por el equipo de desarrollo propio** en el bloque Front Controller de `api/index.php` (líneas 101-197), con validación de edad (14 a 105 años), unicidad de correo y username, algoritmo de hash criptográfico `password_hash($password, PASSWORD_DEFAULT)` (BCRYPT) y manejo transaccional PDO con trigger sincronizador hacia la tabla `persona`.
> 
> 3. **¿Cómo defender esta situación ante el tribunal / profesor?**
>    - Si el profesor pregunta: *«¿Dónde está `RegisteredUserController` y si lo programaron ustedes o viene de Laravel?»*, el alumno responderá con precisión:
>      > *"Profesor, en nuestro proyecto 'Pujol e Hijos S.R.L.' no utilizamos el framework Laravel ni paquetes prediseñados como Laravel Breeze. La arquitectura del backend fue diseñada como una API REST propia basada en PHP Nativo con PDO bajo el patrón Front Controller (`api/index.php`). Por ende, el caso de uso 'Registrar Usuario' no depende de ningún controlador provisto por terceros ni de `RegisteredUserController`: fue programado completamente por nosotros en el despachador de la ruta `POST /auth/register` de `api/index.php`, consumido desde Angular por `AuthHTTPService.createUser()`."*
> 
> 4. **Mapeo Pedagógico de Equivalencia (Si la cátedra evalúa bajo plantilla Laravel):**
>    Para aquellos docentes que exigen la analogía de cómo se distribuirían las responsabilidades si el backend se migrara o mapeara a la convención estándar de Laravel MVC, presentamos la matriz de equivalencia formal:

| Funcionalidad / Caso de Uso | Implementación Real en Pujol e Hijos (`api/index.php`) | Equivalente Estándar en Convención Laravel MVC | Origen Componente |
|---|---|---|---|
| Registrar Usuario | Despachador de ruta `POST /auth/register` | `RegisteredUserController@store` | Propio (En Laravel suele ser generado por Breeze) |
| Iniciar Sesión Tradicional | Despachador de ruta `POST /auth/login` | `AuthenticatedSessionController@store` | Propio (En Laravel provisto por starter kit) |
| Iniciar Sesión con Google | Despachador de ruta `POST /auth/google` (cURL a Google OAuth) | `SocialiteController@callback` / `GoogleAuthController@login` | Propio + Integración con Google API Externa |
| Obtener Perfil Autenticado | Despachador de ruta `GET /auth/me` con `verify_token()` | `ProfileController@show` / `AuthController@user` | Propio |
| Administrar Productos y Precios | Despachador de ruta `/productos` (GET, POST, DELETE) | `ProductoController@index`, `@store`, `@destroy` | Propio |
| Registrar Movimiento de Stock | Despachador de ruta `/movimientos-stock` (GET, POST) | `MovimientoStockController@index`, `@store` | Propio |
| Facturar / Registrar Venta | Despachador de ruta `/ventas` (GET, POST) | `VentaController@index`, `@store` | Propio |
| Control y Arqueo de Caja | Despachador de rutas `/caja/*` (turno, abrir, cerrar, movs) | `CajaTurnoController`, `MovimientoCajaController` | Propio |
| Emitir Comprobante Fiscal | Despachador de ruta `/comprobantes` (GET, POST) | `ComprobanteController@store` | Propio |
| Administrar Usuarios / Roles | Despachadores `/usuarios`, `/roles`, `/permisos` | `UserController`, `RoleController`, `PermissionController` | Propio |

---

### 3. CLASIFICACIÓN RIGUROSA DE COMPONENTES SEGÚN EL REQUISITO DOCENTE

#### A. Componentes Desarrollados por Nosotros (Propiedad del Proyecto)
1. **Frontend Angular 16+ (`admin_metronic_8.2/`):**
   - Controladores de Vista: `VentasComponent`, `StockComponent`, `CatalogoComponent`, `CajaComponent`, `ComprobantesComponent`, `HistorialVentasComponent`, `UserListingComponent`, `RoleListingComponent`, `PermissionListingComponent`, `LoginComponent`, `RegistrationComponent`.
   - Servicios de Estado y Comunicación: `StateService`, `AuthService`, `AuthHTTPService`, `UserService`, `RoleService`.
2. **Backend PHP API REST (`api/index.php`):**
   - Front Controller y Despachador de Rutas central (`$route = parse_url(...)`, `$method = $_SERVER['REQUEST_METHOD']`).
   - Funciones auxiliares de seguridad y transporte: `generate_token()`, `verify_token()`, `base64url_encode()`, `base64url_decode()`, `send_response()`.
   - Transacciones PDO ACID en Ventas, Movimientos de Stock y Apertura/Cierre de Turnos de Caja.
3. **Base de Datos MySQL (`bdPujolScript.sql`):**
   - Tablas de bebidas e inventario: `productos`, `inventario`, `movimientos_stock`.
   - Tablas comerciales y fiscales: `ventas`, `detalle_venta`, `comprobantes`.
   - Tablas de tesorería: `caja_turnos`, `movimientos_caja`.
   - Tablas de identidad y seguridad: `usuario`, `roles`, `usuario_rol`, `dashboard_permisos`, `rol_permiso`, `persona`.
   - Trigger de base de datos: `sync_usuario_to_persona`.

#### B. Componentes del Framework y Plantillas Base
- **Angular Core & Router:** Provee el mecanismo de navegación enrutada (`Routing` en `routing.ts`), inyección de dependencias (`@Injectable`), observadores reactivos (`BehaviorSubject`) y el cliente HTTP (`HttpClient`).
- **Metronic 8.2 Base:** Provee componentes CSS de maquetación, íconos Keenicónicos y utilidades de interfaz gráfica adaptadas con Glassmorphism y Dark Mode `#0b132b`.
- **Librería JWT Nativa:** Implementación artesanal de HS256 (`hash_hmac('sha256', ...)`) desarrollada dentro de `api/index.php` sin dependencias de paquetes externos pesados.

#### C. Sistemas y Servicios Externos (Verdaderos Actores/Sistemas UML)
- **Google OAuth 2.0 API (`https://www.googleapis.com/oauth2/v3/userinfo`):**
  - **Función:** Validación externa de identidad del usuario cuando inicia sesión con cuenta de Google.
  - **Comunicación:** Invocación HTTP segura (cURL) desde `api/index.php` enviando `accessToken` en cabecera Bearer.
  - **Datos Recibidos:** Objeto JSON con `email`, `given_name`, `family_name`, `email_verified`.
  - **Manejo de Respuestas/Errores:** Si el código HTTP difiere de 200, la API responde `HTTP 401: Token de Google inválido o expirado`. Si es exitoso, busca o aprovisiona al usuario en la tabla `usuario` y retorna el JWT del sistema Pujol.
- **Servidor de Base de Datos MySQL:** Sistema externo gestor de datos que interactúa mediante protocolo PDO MySQL en el puerto 3306.

---

### 4. ACLARACIÓN FUNDAMENTAL UML 2.X: POR QUÉ UN FRAMEWORK NO ES UN ACTOR

En la especificación formal **OMG UML 2.5 (Superstructure)**:
- Un **Actor** representa un rol que un usuario humano, un dispositivo de hardware o un **sistema de software externo** juega al interactuar directamente con las funcionalidades del sistema a través de sus límites (*System Boundary*).
- Un **Framework** (como Laravel, Angular o Symfony) es una **herramienta de implementación interna** que corre *dentro* del límite del sistema. Representar a un framework como un "actor externo" es un **error conceptual grave de modelado**, ya que el framework no tiene autonomía ni objetivos de negocio externos: es el código ejecutable de la propia aplicación.
- Para satisfacer cualquier exigencia del evaluador, se incluye una **nota técnica explícita** en los diagramas aclarando los límites del sistema y la distinción formal entre actores de negocio y servicios externos de autenticación como Google OAuth.
