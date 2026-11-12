# GUÍA DE DEFENSA ORAL Y AUDITORÍA DE EXAMEN FINAL
## SISTEMA DE GESTIÓN INTEGRAL "PUJOL E HIJOS S.R.L."
**Distribuidora Mayorista de Bebidas (No Alcohólicas) — Formosa, Argentina**

---

### 1. AUDITORÍA PREVIA AL EXAMEN (CHECKLIST DEL PROFESOR EVALUADOR)

Antes de cualquier presentación, el equipo debe verificar cada una de las 10 preguntas que un tribunal riguroso formula:

| # | Pregunta de Control del Profesor | Estado en Pujol e Hijos | Evidencia / Justificación Técnica |
|---|---|---|---|
| **1** | ¿Los casos de uso coinciden con los requerimientos funcionales del negocio? | **CONFORME (100%)** | Todos los casos de uso modelan operaciones reales de una distribuidora mayorista de bebidas: venta de packs, control de stock, apertura/cierre de caja, facturación y control de accesos. No hay mezclas con otros rubros. |
| **2** | ¿Puedo localizar en el código fuente cada funcionalidad modelada? | **CONFORME (100%)** | Cada óvalo UML posee su correspondiente componente en Angular (`admin_metronic_8.2/`) y bloque en la API (`api/index.php`), con número de línea exacto registrado en la Matriz de Trazabilidad. |
| **3** | ¿Sé con precisión qué controlador atiende la solicitud? | **CONFORME (100%)** | En frontend: componentes TypeScript (`VentasComponent`, `CatalogoComponent`, etc.). En backend: el despachador de rutas del Front Controller en `api/index.php`. |
| **4** | ¿Sé qué método atiende la solicitud y qué métodos son llamados posteriormente? | **CONFORME (100%)** | Identificados en cada módulo. Ej: en Ventas, `checkout()` en frontend -> llama a `StateService.saveVenta()` -> envía HTTP POST a `api/index.php` -> ejecuta bloque `POST /ventas` con transacciones PDO. |
| **5** | ¿Puedo explicar los parámetros recibidos y la respuesta JSON generada? | **CONFORME (100%)** | Detallado para cada endpoint: payload JSON de entrada con tipos de datos, validaciones y objeto de respuesta con código de estado HTTP (200, 201, 400, 401, 403, 500). |
| **6** | ¿Identifiqué correctamente qué es propio y qué proviene del framework? | **CONFORME (100%)** | **Diferenciación estricta:** El proyecto usa PHP Nativo con PDO en el backend (no Laravel). No existe código importado de Laravel ni `RegisteredUserController`. Todo el backend comercial es código propio. |
| **7** | ¿Los sistemas externos están correctamente diferenciados? | **CONFORME (100%)** | Únicamente **Google OAuth 2.0 API** está modelado como sistema externo real, comunicándose por cURL y tokens Bearer. Los frameworks internos (Angular, PHP) no se modelan como actores. |
| **8** | ¿Los nombres de las clases, métodos y campos son coherentes con la BD? | **CONFORME (100%)** | Nomenclatura verificada contra `bdPujolScript.sql`: `productos`, `inventario`, `ventas`, `detalle_venta`, `caja_turnos`, `movimientos_caja`, `comprobantes`, `usuario`, `roles`. |
| **9** | ¿Las asociaciones y relaciones `<<include>>` / `<<extend>>` están justificadas según UML 2.x? | **CONFORME (100%)** | `<<include>>` se usó exclusivamente para pasos obligatorios e incondicionales del flujo transaccional. `<<extend>>` solo para bifurcaciones condicionales (ej. cliente VIP, impresión voluntaria). |
| **10** | ¿Los diagramas están blindados para la defensa oral ante preguntas trampa? | **CONFORME (100%)** | Se dispone del argumento técnico exacto para responder a la pregunta sobre Laravel, desarmando cualquier confusión sin contradecir formalmente las normas de la ingeniería de software. |

---

### 2. CUESTIONARIO TÍPICO DE DEFENSA ORAL Y RESPUESTAS MODELO

#### PREGUNTA 1: «¿Dónde está implementado este caso de uso y qué método se ejecuta?»

* **Caso de Ejemplo:** *Registrar Venta de Bebidas (`CU-VEN-01`)*
* **Respuesta del Alumno:**
  > *"Profesor, este caso de uso tiene una implementación distribuida en dos capas:*
  > 
  > *1. **Capa Cliente (Frontend):** Está implementado en el componente `VentasComponent` ubicado en `admin_metronic_8.2/src/app/pages/ventas/ventas.component.ts`. Cuando el cajero presiona el botón 'Cobrar', se ejecuta el método `checkout()` (línea 128). Este método valida que el carrito no esté vacío, calcula el total neto con el método `getCartTotal()` y delega el despacho al servicio inyectado `StateService.saveVenta()`.*
  > 
  > *2. **Capa Servidor (Backend API):** El servicio hace un `HttpClient.post` hacia la URL `/ventas`. En el servidor, la solicitud es capturada por el Front Controller en `api/index.php`, específicamente en la condición `if ($route === '/ventas' && $method === 'POST')` (línea 897).*
  > 
  > *Allí se inicia una transacción PDO con `$pdo->beginTransaction()`, se inserta la cabecera en la tabla `ventas`, se iteran los productos del carrito insertando en `detalle_venta`, se decrementa el stock mediante una consulta preparada `UPDATE inventario SET stockActual = stockActual - ? WHERE idProd = ?`, y si la caja está abierta, se inserta automáticamente un asiento de tipo 'Ingreso' en la tabla `movimientos_caja`. Si todo es exitoso se ejecuta `$pdo->commit()`, de lo contrario `$pdo->rollBack()`."*

---

#### PREGUNTA 2: «¿Qué controlador recibe la solicitud? ¿Ese controlador lo programaron ustedes o proviene de Laravel?»

* **Caso de Ejemplo:** *Registrar Cuenta de Usuario (`CU-SEC-03`)*
* **Respuesta del Alumno (¡LA RESPUESTA CLAVE DEL EXAMEN!):**
  > *"Profesor, ese controlador **lo programamos 100% nosotros**. No proviene de Laravel ni de ningún paquete de starter kit como Laravel Breeze o Fortify.*
  > 
  > *En nuestro proyecto real 'Pujol e Hijos S.R.L.', la arquitectura del backend fue construida mediante una API REST en PHP Nativo con PDO utilizando el patrón arquitectónico **Front Controller** (`api/index.php`).*
  > 
  > *Por lo tanto, no existe la clase `RegisteredUserController` de Laravel. La petición `POST /auth/register` es recibida por nuestro despachador propio en las líneas 101 a 197 de `api/index.php`. Nuestro código realiza:*
  > *1. Validación de campos requeridos y validación de edad (entre 14 y 105 años).*
  > *2. Control estricto de complejidad de contraseña (mínimo 8 caracteres, números y caracteres especiales).*
  > *3. Comprobación de unicidad de correo y nombre de usuario.*
  > *4. Generación de un CUIL numérico con prefijo 20.*
  > *5. Encriptación de la contraseña con el algoritmo BCRYPT nativo de PHP: `password_hash($password, PASSWORD_DEFAULT)`.*
  > *6. Inserción transaccional en la tabla `usuario` y actualización de la dirección fiscal en `persona`.*
  > 
  > *En caso de que en una evaluación teórica se requiera mapear este controlador a la convención estándar de Laravel, su equivalente directo sería un controlador de recursos o el método `store()` de `RegisteredUserController`."*

---

#### PREGUNTA 3: «¿Qué datos recibe y devuelve el endpoint de Registro de Usuarios?»

* **Respuesta del Alumno:**
  > *"El endpoint `POST /auth/register` recibe en el cuerpo HTTP un JSON con la siguiente estructura:*
  > ```json
  > {
  >   "firstname": "Carlos",
  >   "lastname": "Pérez",
  >   "email": "carlos.perez@gmail.com",
  >   "password": "PasswordSeguro123!",
  >   "phone": "3704123456",
  >   "address": "Av. 25 de Mayo 450, Formosa",
  >   "dob": "1995-04-12"
  > }
  > ```
  > *Y devuelve en caso de éxito una respuesta `HTTP 201 Created` con:*
  > ```json
  > {
  >   "success": true,
  >   "message": "Usuario registrado con exito",
  >   "user_id": 4,
  >   "username": "carlosp"
  > }
  > ```
  > *O en caso de error de validación, un `HTTP 400 Bad Request` indicando el motivo específico (por ejemplo: 'La contraseña debe tener al menos 8 caracteres' o 'El correo electrónico ya está registrado')."*

---

#### PREGUNTA 4: «¿Por qué representaron a Google OAuth como un Actor en el diagrama de casos de uso?»

* **Respuesta del Alumno:**
  > *"Según el estándar formal **OMG UML 2.5**, un Actor no es necesariamente una persona de carne y hueso; un actor representa cualquier entidad **externa a las fronteras del sistema** que interactúa con él para intercambiar datos o prestar un servicio.*
  > 
  > *En nuestro sistema, la API de Google OAuth 2.0 (`https://www.googleapis.com/oauth2/v3/userinfo`) es un sistema de software autónomo e independiente alojado en los servidores de Google. Cuando el usuario hace clic en 'Continuar con Google', nuestra API se comunica mediante una petición cURL externa enviando el token de acceso; los servidores de Google procesan la solicitud, validan la firma y nos devuelven la identidad confirmada del usuario (nombre, apellido y correo).*
  > 
  > *Al estar fuera de nuestro control y de nuestro límite del sistema (*boundary*), clasifica formalmente como un **Actor del Sistema (Sistema Externo)**."*

---

#### PREGUNTA 5: «¿Por qué NO pusieron a Laravel, PHP o Angular como actores en el diagrama?»

* **Respuesta del Alumno:**
  > *"Porque cometeríamos un **error de modelado conceptual**. Un framework de desarrollo (como Angular o Laravel) o un intérprete de lenguaje (como PHP) **no son actores**, sino la tecnología con la cual está construido el sistema por dentro.*
  > 
  > *El límite del sistema (*System Boundary*) encierra a los componentes de software de la aplicación. Representar un framework como actor implicaría decir que el framework es un usuario externo que utiliza el sistema desde afuera, lo cual es incorrecto. El framework ES parte del sistema."*

---

#### PREGUNTA 6: «¿Qué diferencia existe entre el diagrama de casos de uso y la implementación técnica?»

* **Respuesta del Alumno:**
  > *"El Diagrama de Casos de Uso es un modelo de la vista de **caja negra** orientado a describir los **objetivos de negocio y funcionalidades desde la perspectiva de los actores**, abstrayéndose de la tecnología.*
  > 
  > *La implementación técnica, en cambio, representa la vista de **caja blanca**: clases TypeScript, controladores, inyección de dependencias, servicios HTTP, consultas SQL preparadas, transacciones ACID y esquemas de base de datos relacionales.*
  > 
  > *La correspondencia entre ambos mundos no se hace metiendo controladores dentro del óvalo de caso de uso (lo cual violaría la sintaxis de UML), sino a través de la **Matriz de Trazabilidad**, donde cada caso de uso se mapea biunívocamente a un archivo, una ruta, un método y una tabla de base de datos."*

---

#### PREGUNTA 7: «¿Por qué 'Descontar Stock' tiene una relación `<<include>>` con 'Registrar Venta'?»

* **Respuesta del Alumno:**
  > *"Porque en la especificación UML 2.x, la relación `<<include>>` modela un comportamiento que se ejecuta **siempre y de manera obligatoria** cada vez que se dispara el caso de uso base.*
  > 
  > *En el negocio de la distribuidora de bebidas Pujol e Hijos, no puede existir una venta confirmada que no impacte en el inventario. En el código fuente, la deducción de stock no es opcional ni condicional: está programada dentro de la misma transacción PDO en `api/index.php` (línea 918 y 927):*
  > ```php
  > $stmtInv = $pdo->prepare("UPDATE inventario SET stockActual = stockActual - ? WHERE idProd = ?");
  > $stmtInv->execute([$qty, $productId]);
  > ```
  > *Al ser un paso ineludible y parte del flujo transaccional atómico, su representación formal correcta es `<<include>>`."*

---

#### PREGUNTA 8: «¿Y por qué 'Aplicar Descuento VIP' es un `<<extend>>`?»

* **Respuesta del Alumno:**
  > *"Porque la relación `<<extend>>` en UML 2.x se utiliza para modelar un comportamiento **opcional o condicional** que solo se ejecuta si se cumple un punto de extensión específico.*
  > 
  > *En nuestro sistema, el descuento no se aplica a todas las ventas: solo se dispara si el cliente asignado a la venta tiene el atributo `isVIP == true`. En `ventas.component.ts` (línea 118):*
  > ```typescript
  > if (this.selectedClient && this.selectedClient.isVIP) {
  >   return this.getCartSubtotal() * (this.selectedClient.vipDiscount / 100);
  > }
  > return 0;
  > ```
  > *Al depender de una condición booleana del cliente nominado, representa el caso canónico de una extensión `<<extend>>` con condición de guardia."*
