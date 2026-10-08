<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Fallback for getallheaders() if not running under Apache
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// Database configuration
$db_host = '127.0.0.1';
$db_name = 'pujol_e_hijos';
$db_user = 'root';
$db_pass = '';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error de conexion a la base de datos.",
        "error" => $e->getMessage(),
        "hint" => "Asegurate de que WampServer este activo, que la base de datos '$db_name' exista y que hayas importado el archivo 'bdPujolScript.sql'."
    ]);
    exit;
}

// Simple JWT signature helper
define('JWT_SECRET', 'pujol_super_secret_key_123456');

function generate_token($userId) {
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode([
        'sub' => $userId,
        'exp' => time() + 3600 * 24 // 24 hours
    ]));
    $signature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $signature = base64url_encode($signature);
    return "$header.$payload.$signature";
}

function verify_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($header, $payload, $signature) = $parts;
    $validSignature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $validSignature = base64url_encode($validSignature);
    if ($signature !== $validSignature) return false;
    $data = json_decode(base64url_decode($payload), true);
    if (time() > $data['exp']) return false;
    return $data['sub'];
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

// Helper to send JSON responses
function send_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Simple Router logic
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = $_SERVER['SCRIPT_NAME'];
$basePath = dirname($scriptName);
$route = str_replace($basePath, '', $requestUri);
$route = parse_url($route, PHP_URL_PATH);
$route = '/' . trim($route, '/');

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle POST /auth/register
if ($route === '/auth/register' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Normalize fields (accept both Spanish/English inputs)
    $firstname = $input['firstname'] ?? $input['nombre'] ?? '';
    $lastname = $input['lastname'] ?? $input['apellido'] ?? '';
    $email = $input['email'] ?? $input['correo'] ?? '';
    $password = $input['password'] ?? $input['contrasena'] ?? '';
    $phone = $input['phone'] ?? $input['telefono'] ?? '';
    $address = $input['address'] ?? $input['direccion'] ?? '';
    $dob = $input['dob'] ?? $input['fechaNacimiento'] ?? '';

    if (empty($firstname) || empty($lastname) || empty($email) || empty($password) || empty($dob)) {
        send_response(["success" => false, "message" => "Faltan campos obligatorios (nombre, apellido, email, password, fecha de nacimiento)"], 400);
    }

    if (strlen($password) < 8 || preg_match('/\s/', $password) || !preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[^a-zA-Z0-9]/', $password)) {
        send_response(["success" => false, "message" => "La contraseña debe tener al menos 8 caracteres (sin espacios) e incluir letras, números y caracteres especiales."], 400);
    }

    // Validate age range (between 14 and 105 years old based on current year)
    $birthDate = strtotime($dob);
    if (!$birthDate) {
        send_response(["success" => false, "message" => "Formato de fecha de nacimiento invalido"], 400);
    }
    $birthYear = (int)date('Y', $birthDate);
    $currentYear = (int)date('Y');
    $age = $currentYear - $birthYear;
    if ($age < 14 || $age > 105) {
        send_response(["success" => false, "message" => "No cumple con el limite de edad"], 400);
    }

    // Check if email already exists
    $stmt = $pdo->prepare("SELECT idUsu FROM usuario WHERE correoUsu = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        send_response(["success" => false, "message" => "El correo electronico ya esta registrado"], 400);
    }

    // Check or generate unique username
    $username = $input['username'] ?? $input['usuario'] ?? '';
    if (!empty($username)) {
        $username = preg_replace('/[^a-zA-Z0-9_\.]/', '', $username);
        $stmt = $pdo->prepare("SELECT idUsu FROM usuario WHERE usuarioUsu = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            send_response(["success" => false, "message" => "El nombre de usuario ya esta registrado"], 400);
        }
    } else {
        $username = explode('@', $email)[0];
        $username = preg_replace('/[^a-zA-Z0-9_\.]/', '', $username);
        $baseUsername = $username;
        $counter = 1;
        do {
            $stmt = $pdo->prepare("SELECT idUsu FROM usuario WHERE usuarioUsu = ?");
            $stmt->execute([$username]);
            $exists = $stmt->fetch();
            if ($exists) {
                $username = $baseUsername . $counter;
                $counter++;
            }
        } while ($exists);
    }

    // Generate unique CUIL/DNI matching trigger logic (20 + 8 digits + 9)
    $cuil = '20' . str_pad(mt_rand(10000000, 99999999), 8, '0', STR_PAD_LEFT) . '9';

    // Hash password using BCRYPT
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    try {
        $pdo->beginTransaction();

        // Insert into usuario
        $stmt = $pdo->prepare("INSERT INTO usuario (nombreUsu, apellidoUsu, correoUsu, usuarioUsu, contrasenaUsu, CUILUsu, telefonoUsu, estadoUsu, rolUsu) VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo', 'Cliente')");
        $stmt->execute([$firstname, $lastname, $email, $username, $hashedPassword, $cuil, $phone]);
        $userId = $pdo->lastInsertId();

        // Trigger 'sync_usuario_to_persona' will automatically insert the persona.
        // We will update the persona with the address details now.
        $stmt = $pdo->prepare("UPDATE persona SET direccionFiscalPers = ? WHERE idUsuarioPers = ?");
        $stmt->execute([$address, $userId]);

        $pdo->commit();

        send_response([
            "success" => true,
            "message" => "Usuario registrado con exito",
            "user_id" => $userId,
            "username" => $username
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        send_response(["success" => false, "message" => "Error al registrar el usuario: " . $e->getMessage()], 500);
    }
}

// Handle POST /auth/login
if ($route === '/auth/login' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = $input['email'] ?? $input['correo'] ?? '';
    $password = $input['password'] ?? $input['contrasena'] ?? '';

    if (empty($email) || empty($password)) {
        send_response(["success" => false, "message" => "Faltan credenciales (email y password)"], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM usuario WHERE correoUsu = ? OR usuarioUsu = ? OR SUBSTRING_INDEX(correoUsu, '@', 1) = ? OR nombreUsu = ?");
    $stmt->execute([$email, $email, $email, $email]);
    $user = $stmt->fetch();

    if ($user) {
        if (strcasecmp($user['estadoUsu'], 'Inactivo') === 0) {
            send_response(["success" => false, "message" => "Tu cuenta está desactivada. Tienes acceso denegado al sistema.", "error_type" => "no_permission"], 403);
        }

        if (password_verify($password, $user['contrasenaUsu']) || $password === $user['contrasenaUsu']) {
            // Check if user has dashboard access (not just Cliente)
            $hasAccess = false;
            try {
                $stmtRoles = $pdo->prepare("SELECT r.idRol FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE ur.idUsu = ? AND r.idRol IN (1, 2)");
                $stmtRoles->execute([$user['idUsu']]);
                $hasAccess = $stmtRoles->fetch();
            } catch (Exception $e) {
                // Table may not exist yet
            }

            // Also check by rolUsu column as fallback
            if (!$hasAccess && !empty($user['rolUsu'])) {
                try {
                    $stmtRL = $pdo->prepare("SELECT idRol FROM roles WHERE nombreRol = ? AND idRol IN (1, 2)");
                    $stmtRL->execute([$user['rolUsu']]);
                    $hasAccess = $stmtRL->fetch();
                } catch (Exception $e) {
                    // roles table may not exist; grant access if rolUsu is admin/empleado
                    if (in_array($user['rolUsu'], ['Administrador', 'Admin', 'Empleado'])) {
                        $hasAccess = true;
                    }
                }
            }

            if (!$hasAccess) {
                send_response(["success" => false, "message" => "Acceso denegado", "error_type" => "no_permission"], 403);
            }

            // Generate JWT token
            $token = generate_token($user['idUsu']);

            send_response([
                "authToken" => $token,
                "refreshToken" => $token, // simplify for frontend
                "expiresIn" => date('c', time() + 3600 * 24)
            ]);
        } else {
            send_response(["success" => false, "message" => "El email y/o la contrasena son incorrectos"], 401);
        }
    } else {
        send_response(["success" => false, "message" => "El email y/o la contrasena son incorrectos"], 401);
    }
}

// Handle POST /auth/google
if ($route === '/auth/google' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $accessToken = $input['accessToken'] ?? '';

    if (empty($accessToken)) {
        send_response(["success" => false, "message" => "Falta el token de acceso de Google"], 400);
    }

    // Call Google UserInfo API to verify token and get user details
    $url = "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" . urlencode($accessToken);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        send_response(["success" => false, "message" => "Token de Google invalido o expirado"], 401);
    }

    $googleUser = json_decode($response, true);
    $email = $googleUser['email'] ?? '';
    $firstname = $googleUser['given_name'] ?? $googleUser['name'] ?? 'Google';
    $lastname = $googleUser['family_name'] ?? 'Usuario';
    
    if (empty($email)) {
        send_response(["success" => false, "message" => "No se pudo obtener el correo electronico de Google"], 400);
    }

    // Check if email already exists in usuario
    $stmt = $pdo->prepare("SELECT * FROM usuario WHERE correoUsu = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Generate unique username (usuarioUsu)
        $baseUsername = strtolower($firstname . substr($lastname, 0, 1));
        $username = $baseUsername;
        $counter = 1;
        do {
            $stmt = $pdo->prepare("SELECT idUsu FROM usuario WHERE usuarioUsu = ?");
            $stmt->execute([$username]);
            $exists = $stmt->fetch();
            if ($exists) {
                $username = $baseUsername . $counter;
                $counter++;
            }
        } while ($exists);

        // Generate unique CUIL/DNI (20 + 8 digits + 9)
        $cuil = '20' . str_pad(mt_rand(10000000, 99999999), 8, '0', STR_PAD_LEFT) . '9';
        // Set a random password for Google-registered users
        $randomPassword = bin2hex(random_bytes(16)) . '!1a';
        $hashedPassword = password_hash($randomPassword, PASSWORD_DEFAULT);
        $phone = '';
        $address = '';

        try {
            $pdo->beginTransaction();

            // Insert into usuario
            $stmt = $pdo->prepare("INSERT INTO usuario (nombreUsu, apellidoUsu, correoUsu, usuarioUsu, contrasenaUsu, CUILUsu, telefonoUsu, estadoUsu, rolUsu) VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo', 'Cliente')");
            $stmt->execute([$firstname, $lastname, $email, $username, $hashedPassword, $cuil, $phone]);
            $userId = $pdo->lastInsertId();

            $pdo->commit();

            // Fetch the newly created user
            $stmt = $pdo->prepare("SELECT * FROM usuario WHERE idUsu = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al registrar usuario de Google: " . $e->getMessage()], 500);
        }
    }

    if ($user && strcasecmp($user['estadoUsu'], 'Inactivo') === 0) {
        send_response(["success" => false, "message" => "Tu cuenta está desactivada. Tienes acceso denegado al sistema.", "error_type" => "no_permission"], 403);
    }

    // Check if user has dashboard access (not just Cliente)
    $hasAccess = false;
    try {
        $stmtRoles = $pdo->prepare("SELECT r.idRol FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE ur.idUsu = ? AND r.idRol IN (1, 2)");
        $stmtRoles->execute([$user['idUsu']]);
        $hasAccess = $stmtRoles->fetch();
    } catch (Exception $e) {
        // Table may not exist yet
    }

    // Also check by rolUsu column as fallback
    if (!$hasAccess && !empty($user['rolUsu'])) {
        try {
            $stmtRL = $pdo->prepare("SELECT idRol FROM roles WHERE nombreRol = ? AND idRol IN (1, 2)");
            $stmtRL->execute([$user['rolUsu']]);
            $hasAccess = $stmtRL->fetch();
        } catch (Exception $e) {
            // roles table may not exist; grant access if rolUsu is admin/empleado
            if (in_array($user['rolUsu'], ['Administrador', 'Admin', 'Empleado'])) {
                $hasAccess = true;
            }
        }
    }

    if (!$hasAccess) {
        send_response(["success" => false, "message" => "Acceso denegado", "error_type" => "no_permission"], 403);
    }

    // Generate JWT token for the user
    $token = generate_token($user['idUsu']);
    
    send_response([
        "authToken" => $token,
        "refreshToken" => $token,
        "expiresIn" => date('c', time() + 3600 * 24)
    ]);
}

// Handle GET /auth/me
if ($route === '/auth/me' && $method === 'GET') {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $userId = verify_token($token);
        
        if ($userId) {
            $stmt = $pdo->prepare("SELECT * FROM usuario WHERE idUsu = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            if ($user) {
                if (strcasecmp($user['estadoUsu'], 'Inactivo') === 0) {
                    send_response(["success" => false, "message" => "Cuenta desactivada"], 403);
                }
                
                // Get additional info from persona
                $stmtPers = $pdo->prepare("SELECT * FROM persona WHERE idUsuarioPers = ?");
                $stmtPers->execute([$userId]);
                $persona = $stmtPers->fetch();

                // Get role IDs
                $stmtR = $pdo->prepare("SELECT idRol FROM usuario_rol WHERE idUsu = ?");
                $stmtR->execute([$userId]);
                $roles = array_map('intval', $stmtR->fetchAll(PDO::FETCH_COLUMN));
                if (empty($roles)) {
                    if ($user['rolUsu']) {
                        $stmtRl = $pdo->prepare("SELECT idRol FROM roles WHERE nombreRol = ?");
                        $stmtRl->execute([$user['rolUsu']]);
                        $rId = $stmtRl->fetchColumn();
                        if ($rId) {
                            $roles = [(int)$rId];
                        }
                    }
                }
                if (empty($roles)) {
                    $roles = [3]; // Default to Cliente
                }

                $firstname = $user['nombreUsu'];
                $lastname = $user['apellidoUsu'];
                if (($lastname === '-' || empty($lastname)) && strpos($firstname, ' ') !== false) {
                    $parts = explode(' ', $firstname);
                    $firstname = $parts[0];
                    $lastname = implode(' ', array_slice($parts, 1));
                } else if ($lastname === '-') {
                    $lastname = '';
                }

                send_response([
                    "id" => (int)$user['idUsu'],
                    "username" => $user['usuarioUsu'] ?? explode('@', $user['correoUsu'])[0],
                    "fullname" => trim($firstname . ' ' . $lastname),
                    "firstname" => $firstname,
                    "lastname" => $lastname,
                    "email" => $user['correoUsu'],
                    "phone" => $user['telefonoUsu'],
                    "roles" => $roles,
                    "pic" => "./assets/media/avatars/blank.png",
                    "address" => [
                        "addressLine" => $persona['direccionFiscalPers'] ?? '',
                        "city" => "",
                        "state" => "",
                        "postCode" => ""
                    ]
                ]);
            }
        }
    }
    send_response(["success" => false, "message" => "No autorizado"], 401);
}

// Helper function to save base64 uploaded image as physical file in /uploads
function save_base64_image($base64_string) {
    if (empty($base64_string)) {
        return '';
    }
    // If it's already a saved URL or path, keep it
    if (!preg_match('/^data:image\/(\w+);base64,/', $base64_string, $type)) {
        return $base64_string;
    }
    
    $output_dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($output_dir)) {
        mkdir($output_dir, 0755, true);
    }
    
    $ext = strtolower($type[1]);
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
        $ext = 'jpg';
    }
    
    $data = substr($base64_string, strpos($base64_string, ',') + 1);
    $data = base64_decode($data);
    if ($data === false) {
        return '';
    }
    
    $fileName = uniqid() . '.' . $ext;
    $filePath = $output_dir . '/' . $fileName;
    
    if (file_put_contents($filePath, $data)) {
        return 'uploads/' . $fileName;
    }
    
    return '';
}

// Handle CRUD for /productos
if ($route === '/productos') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT p.idProd as id, p.codigoProd as code, p.nombreProd as name, 
                                    p.descripcionProd as description, p.precioUnitario as price, 
                                    p.estadoProd as status, inv.stockActual as quantity, inv.stockMinimo as minThreshold 
                             FROM productos p 
                             LEFT JOIN inventario inv ON p.idProd = inv.idProd 
                             WHERE p.estadoProd = 'Activo'");
        $items = $stmt->fetchAll();
        
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['quantity'] = $item['quantity'] !== null ? (int)$item['quantity'] : 0;
            $item['minThreshold'] = $item['minThreshold'] !== null ? (int)$item['minThreshold'] : 0;
            $item['price'] = (float)$item['price'];
        }
        send_response($items);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $code = $input['code'] ?? null;
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $price = isset($input['price']) ? (float)$input['price'] : 0.0;
        $quantity = isset($input['quantity']) ? (int)$input['quantity'] : 0;
        $minThreshold = isset($input['minThreshold']) ? (int)$input['minThreshold'] : 0;

        if (empty($name)) {
            send_response(["success" => false, "message" => "El nombre es obligatorio"], 400);
        }

        try {
            $pdo->beginTransaction();
            
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE productos SET codigoProd = ?, nombreProd = ?, descripcionProd = ?, precioUnitario = ? WHERE idProd = ?");
                $stmt->execute([$code, $name, $description, $price, $id]);
                
                $stmtCheck = $pdo->prepare("SELECT idInv FROM inventario WHERE idProd = ?");
                $stmtCheck->execute([$id]);
                if ($stmtCheck->fetch()) {
                    $stmtInv = $pdo->prepare("UPDATE inventario SET stockActual = ?, stockMinimo = ? WHERE idProd = ?");
                    $stmtInv->execute([$quantity, $minThreshold, $id]);
                } else {
                    $stmtInv = $pdo->prepare("INSERT INTO inventario (idProd, stockActual, stockMinimo) VALUES (?, ?, ?)");
                    $stmtInv->execute([$id, $quantity, $minThreshold]);
                }
            } else {
                $stmt = $pdo->prepare("INSERT INTO productos (codigoProd, nombreProd, descripcionProd, precioUnitario, estadoProd) VALUES (?, ?, ?, ?, 'Activo')");
                $stmt->execute([$code, $name, $description, $price]);
                $id = $pdo->lastInsertId();
                
                $stmtInv = $pdo->prepare("INSERT INTO inventario (idProd, stockActual, stockMinimo) VALUES (?, ?, ?)");
                $stmtInv->execute([$id, $quantity, $minThreshold]);
            }
            
            $pdo->commit();
            send_response(["success" => true, "id" => (int)$id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al guardar el producto: " . $e->getMessage()], 500);
        }
    }
    
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            send_response(["success" => false, "message" => "ID no proporcionado"], 400);
        }
        
        try {
            // Validate if product is used in active sales
            $stmtCheck = $pdo->prepare("SELECT d.idDetalle FROM detalle_venta d JOIN ventas v ON d.idVenta = v.idVenta WHERE d.idProd = ? AND v.estadoVenta = 'Completada'");
            $stmtCheck->execute([$id]);
            
            if ($stmtCheck->fetch()) {
                send_response([
                    "success" => false, 
                    "message" => "No se puede eliminar el producto porque tiene un historial de ventas asociado. Su estado será cambiado a Inactivo."
                ], 400); // we could soft-delete but for simplicity we return error and tell them we can't
                // Or better, just soft delete:
                // $pdo->prepare("UPDATE productos SET estadoProd = 'Inactivo' WHERE idProd = ?")->execute([$id]);
            }
            
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE productos SET estadoProd = 'Inactivo' WHERE idProd = ?");
            $stmt->execute([$id]);
            $pdo->commit();
            
            send_response(["success" => true]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            send_response(["success" => false, "message" => "Error al eliminar el producto: " . $e->getMessage()], 500);
        }
    }
}

// Handle CRUD for /proveedores (Suppliers)
if ($route === '/proveedores') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT idPro as id, nombrePro as name, emailPro as contact, 
                                    telefonoPro as phone, direccionPro as catalogStr 
                             FROM proveedor");
        $items = $stmt->fetchAll();
        
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            
            $str = $item['catalogStr'];
            if (strpos($str, 'Catalog: ') === 0) {
                $catStr = substr($str, 9);
                $item['catalog'] = $catStr ? array_map('trim', explode(',', $catStr)) : [];
            } else {
                $item['catalog'] = [];
            }
            unset($item['catalogStr']);
        }
        send_response($items);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $name = $input['name'] ?? '';
        $contact = $input['contact'] ?? '';
        $phone = $input['phone'] ?? '';
        $catalog = $input['catalog'] ?? [];
        
        if (empty($name) || empty($contact) || empty($phone)) {
            send_response(["success" => false, "message" => "Faltan campos obligatorios"], 400);
        }
        
        $catalogStr = 'Catalog: ' . implode(', ', $catalog);
        
        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE proveedor SET nombrePro = ?, emailPro = ?, telefonoPro = ?, direccionPro = ? WHERE idPro = ?");
                $stmt->execute([$name, $contact, $phone, $catalogStr, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO proveedor (nombrePro, emailPro, telefonoPro, direccionPro, CUITPro, ciudadPro, provinciaPro) VALUES (?, ?, ?, ?, '00-00000000-0', 'Desconocida', 'Desconocida')");
                $stmt->execute([$name, $contact, $phone, $catalogStr]);
                $id = $pdo->lastInsertId();
            }
            send_response(["success" => true, "id" => (int)$id]);
        } catch (Exception $e) {
            send_response(["success" => false, "message" => "Error al guardar el proveedor: " . $e->getMessage()], 500);
        }
    }
    
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            send_response(["success" => false, "message" => "ID no proporcionado"], 400);
        }
        
        try {
            $stmt = $pdo->prepare("DELETE FROM proveedor WHERE idPro = ?");
            $stmt->execute([$id]);
            send_response(["success" => true]);
        } catch (Exception $e) {
            // Check for foreign key constraint violation (SQLSTATE 23000)
            if ($e->getCode() == '23000') {
                send_response([
                    "success" => false, 
                    "message" => "No se puede eliminar el proveedor porque tiene insumos asociados en el inventario. Por favor, elimine o reasigne los insumos antes de continuar."
                ], 400);
            }
            send_response(["success" => false, "message" => "Error al eliminar el proveedor: " . $e->getMessage()], 500);
        }
    }
}

// Handle CRUD for /recetas (Recipes)
if ($route === '/recetas') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT idReceta as id, nombreReceta as name, instruccionesReceta as instructions, 
                                    margenGananciaReceta as marginPercent, descripcionReceta as image 
                             FROM recetas 
                             WHERE estadoReceta = 'Activa'");
        $recipes = $stmt->fetchAll();
        
        foreach ($recipes as &$r) {
            $r['id'] = (int)$r['id'];
            $r['marginPercent'] = (float)$r['marginPercent'];
            
            $stmtIng = $pdo->prepare("SELECT insumoIdRecIng as stockId, cantidadNecesaria as quantity, unidadMedidaRecIng as unit, pesoPorUnidadRecIng as unitWeight 
                                      FROM receta_ingrediente 
                                      WHERE recetaIdRecIng = ?");
            $stmtIng->execute([$r['id']]);
            $ingredients = $stmtIng->fetchAll();
            
            foreach ($ingredients as &$ing) {
                $ing['stockId'] = (int)$ing['stockId'];
                $ing['quantity'] = (float)$ing['quantity'];
                $ing['unit'] = $ing['unit'] ?? '';
                $ing['unitWeight'] = $ing['unitWeight'] !== null ? (float)$ing['unitWeight'] : null;
            }
            $r['ingredients'] = $ingredients;
        }
        send_response($recipes);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $name = $input['name'] ?? '';
        $instructions = $input['instructions'] ?? '';
        $marginPercent = isset($input['marginPercent']) ? (float)$input['marginPercent'] : 50.0;
        $image = $input['image'] ?? '';
        $ingredients = $input['ingredients'] ?? [];
        
        if (empty($name) || empty($ingredients)) {
            send_response(["success" => false, "message" => "Nombre e ingredientes son obligatorios"], 400);
        }
        
        $imagePath = save_base64_image($image);
        
        try {
            $pdo->beginTransaction();
            
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE recetas SET nombreReceta = ?, instruccionesReceta = ?, margenGananciaReceta = ?, descripcionReceta = ? WHERE idReceta = ?");
                $stmt->execute([$name, $instructions, $marginPercent, $imagePath, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO recetas (nombreReceta, instruccionesReceta, margenGananciaReceta, descripcionReceta, estadoReceta) VALUES (?, ?, ?, ?, 'Activa')");
                $stmt->execute([$name, $instructions, $marginPercent, $imagePath]);
                $id = $pdo->lastInsertId();
            }
            
            $stmtDel = $pdo->prepare("DELETE FROM receta_ingrediente WHERE recetaIdRecIng = ?");
            $stmtDel->execute([$id]);
            
            foreach ($ingredients as $ing) {
                $stockId = (int)$ing['stockId'];
                $qty = (float)$ing['quantity'];
                $frontendUnit = isset($ing['unit']) ? trim($ing['unit']) : '';
                $unitWeight = isset($ing['unitWeight']) && $ing['unitWeight'] !== '' ? (float)$ing['unitWeight'] : null;
                
                $stmtIns = $pdo->prepare("SELECT unidadMedidaIns, pesoPorUnidadIns, precioCompraIns FROM insumo WHERE idIns = ?");
                $stmtIns->execute([$stockId]);
                $insDetails = $stmtIns->fetch();
                $stockUnit = $insDetails ? strtolower($insDetails['unidadMedidaIns']) : 'unidades';
                $stockUnitWeight = $insDetails && isset($insDetails['pesoPorUnidadIns']) ? (float)$insDetails['pesoPorUnidadIns'] : null;
                $unit = !empty($frontendUnit) ? $frontendUnit : $stockUnit;
                $cost = $insDetails ? (float)$insDetails['precioCompraIns'] : 0.0;
                
                $getBaseQty = function($q, $u, $w) {
                    $l = strtolower($u);
                    if (strpos($l, 'kg') !== false || strpos($l, 'ltr') !== false || strpos($l, 'litro') !== false) return $q * 1000;
                    if (strpos($l, 'gr') !== false || strpos($l, 'ml') !== false) return $q;
                    if ($w && $w > 0) return $q * $w;
                    return $q;
                };
                
                $ingBase = $getBaseQty($qty, $unit, $unitWeight);
                $stockBase = $getBaseQty(1, $stockUnit, $stockUnitWeight);
                
                $costProportional = $stockBase > 0 ? $ingBase * ($cost / $stockBase) : 0;
                
                $stmtAdd = $pdo->prepare("INSERT INTO receta_ingrediente (recetaIdRecIng, insumoIdRecIng, cantidadNecesaria, unidadMedidaRecIng, pesoPorUnidadRecIng, costoProporcional) VALUES (?, ?, ?, ?, ?, ?)");
                $stmtAdd->execute([$id, $stockId, $qty, $unit, $unitWeight, $costProportional]);
            }
            
            $pdo->commit();
            send_response(["success" => true, "id" => (int)$id, "image" => $imagePath]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al guardar la receta: " . $e->getMessage()], 500);
        }
    }
    
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            send_response(["success" => false, "message" => "ID no proporcionado"], 400);
        }
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("UPDATE recetas SET estadoReceta = 'Inactiva' WHERE idReceta = ?");
            $stmt->execute([$id]);
            
            $pdo->commit();
            send_response(["success" => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al eliminar la receta: " . $e->getMessage()], 500);
        }
    }
}

// Handle CRUD for /ventas
if ($route === '/ventas') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT v.idVenta as id, v.fechaVenta as date, v.totalVenta as total, v.estadoVenta as status, u.nombreUsu as userName 
                             FROM ventas v
                             LEFT JOIN usuario u ON v.idUsu = u.idUsu
                             ORDER BY v.fechaVenta DESC");
        $items = $stmt->fetchAll();
        
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['total'] = (float)$item['total'];
            
            // Get details
            $stmtDet = $pdo->prepare("SELECT d.idDetalle as detailId, d.idProd as productId, p.nombreProd as productName, d.cantidad as quantity, d.precioUnitario as price, d.subtotal as subtotal 
                                      FROM detalle_venta d
                                      LEFT JOIN productos p ON d.idProd = p.idProd
                                      WHERE d.idVenta = ?");
            $stmtDet->execute([$item['id']]);
            $details = $stmtDet->fetchAll();
            
            foreach ($details as &$d) {
                $d['detailId'] = (int)$d['detailId'];
                $d['productId'] = (int)$d['productId'];
                $d['quantity'] = (int)$d['quantity'];
                $d['price'] = (float)$d['price'];
                $d['subtotal'] = (float)$d['subtotal'];
            }
            $item['details'] = $details;
        }
        send_response($items);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $total = isset($input['total']) ? (float)$input['total'] : 0.0;
        $idUsu = isset($input['idUsu']) ? (int)$input['idUsu'] : 1; // Default to admin for now
        $details = $input['details'] ?? [];
        
        if (empty($details)) {
            send_response(["success" => false, "message" => "La venta debe contener al menos un producto."], 400);
        }

        try {
            $pdo->beginTransaction();
            
            // 1. Insert Venta
            $stmt = $pdo->prepare("INSERT INTO ventas (totalVenta, idUsu, estadoVenta) VALUES (?, ?, 'Completada')");
            $stmt->execute([$total, $idUsu]);
            $idVenta = $pdo->lastInsertId();
            
            // 2. Insert details and deduct inventory
            $stmtDet = $pdo->prepare("INSERT INTO detalle_venta (idVenta, idProd, cantidad, precioUnitario, subtotal) VALUES (?, ?, ?, ?, ?)");
            $stmtInv = $pdo->prepare("UPDATE inventario SET stockActual = stockActual - ? WHERE idProd = ?");
            
            foreach ($details as $d) {
                $productId = (int)$d['productId'];
                $qty = (int)$d['quantity'];
                $price = (float)$d['price'];
                $subtotal = $qty * $price;
                
                $stmtDet->execute([$idVenta, $productId, $qty, $price, $subtotal]);
                $stmtInv->execute([$qty, $productId]);
            }
            
            // 3. Register Caja movement if a turn is open
            $stmtCheckCaja = $pdo->query("SELECT idTurno FROM caja_turnos WHERE estadoTurno = 'Abierto' LIMIT 1");
            $turno = $stmtCheckCaja->fetch();
            if ($turno) {
                $stmtCaja = $pdo->prepare("INSERT INTO movimientos_caja (idTurno, tipoMovimiento, concepto, monto, idUsu, idVenta) VALUES (?, 'Ingreso', ?, ?, ?, ?)");
                $stmtCaja->execute([$turno['idTurno'], "Venta #" . $idVenta, $total, $idUsu, $idVenta]);
            }
            
            $pdo->commit();
            send_response(["success" => true, "id" => (int)$idVenta]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al registrar la venta: " . $e->getMessage()], 500);
        }
    }
}

// Handle CRUD for /caja
if (strpos($route, '/caja') === 0) {
    if ($route === '/caja/turno' && $method === 'GET') {
        $stmt = $pdo->query("SELECT t.idTurno, t.fechaApertura, t.montoInicial, t.estadoTurno, u.nombreUsu as userName 
                             FROM caja_turnos t 
                             LEFT JOIN usuario u ON t.idUsu = u.idUsu 
                             WHERE t.estadoTurno = 'Abierto' LIMIT 1");
        $turno = $stmt->fetch();
        if ($turno) {
            $turno['idTurno'] = (int)$turno['idTurno'];
            $turno['montoInicial'] = (float)$turno['montoInicial'];
            
            // Calculate current total
            $stmtMov = $pdo->prepare("SELECT SUM(CASE WHEN tipoMovimiento = 'Ingreso' THEN monto ELSE -monto END) as balance FROM movimientos_caja WHERE idTurno = ?");
            $stmtMov->execute([$turno['idTurno']]);
            $balance = (float)$stmtMov->fetchColumn();
            $turno['saldoActual'] = $turno['montoInicial'] + $balance;
        }
        send_response(["success" => true, "turno" => $turno ?: null]);
    }

    if ($route === '/caja/abrir' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $montoInicial = isset($input['montoInicial']) ? (float)$input['montoInicial'] : 0.0;
        $idUsu = 1; // Default admin

        // Check if there's already an open turn
        $stmtCheck = $pdo->query("SELECT idTurno FROM caja_turnos WHERE estadoTurno = 'Abierto'");
        if ($stmtCheck->fetch()) {
            send_response(["success" => false, "message" => "Ya existe una caja abierta. Por favor ciérrela primero."], 400);
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO caja_turnos (montoInicial, idUsu, estadoTurno) VALUES (?, ?, 'Abierto')");
            $stmt->execute([$montoInicial, $idUsu]);
            send_response(["success" => true, "idTurno" => (int)$pdo->lastInsertId()]);
        } catch (Exception $e) {
            send_response(["success" => false, "message" => "Error al abrir caja: " . $e->getMessage()], 500);
        }
    }

    if ($route === '/caja/cerrar' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $idTurno = isset($input['idTurno']) ? (int)$input['idTurno'] : 0;
        $montoFinal = isset($input['montoFinal']) ? (float)$input['montoFinal'] : 0.0;
        $diferencia = isset($input['diferencia']) ? (float)$input['diferencia'] : 0.0;

        try {
            $stmt = $pdo->prepare("UPDATE caja_turnos SET fechaCierre = CURRENT_TIMESTAMP, montoFinal = ?, diferencia = ?, estadoTurno = 'Cerrado' WHERE idTurno = ?");
            $stmt->execute([$montoFinal, $diferencia, $idTurno]);
            send_response(["success" => true]);
        } catch (Exception $e) {
            send_response(["success" => false, "message" => "Error al cerrar caja: " . $e->getMessage()], 500);
        }
    }

    if ($route === '/caja/movimientos' && $method === 'GET') {
        $idTurno = isset($_GET['idTurno']) ? (int)$_GET['idTurno'] : 0;
        $stmt = $pdo->prepare("SELECT m.idMovCaja, m.tipoMovimiento, m.concepto, m.monto, m.fechaMovimiento, m.idVenta, u.nombreUsu as userName 
                               FROM movimientos_caja m 
                               LEFT JOIN usuario u ON m.idUsu = u.idUsu 
                               WHERE m.idTurno = ? ORDER BY m.fechaMovimiento DESC");
        $stmt->execute([$idTurno]);
        $movs = $stmt->fetchAll();
        foreach ($movs as &$m) {
            $m['idMovCaja'] = (int)$m['idMovCaja'];
            $m['monto'] = (float)$m['monto'];
            $m['idVenta'] = $m['idVenta'] ? (int)$m['idVenta'] : null;
        }
        send_response($movs);
    }

    if ($route === '/caja/movimiento' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $idTurno = isset($input['idTurno']) ? (int)$input['idTurno'] : 0;
        $tipo = $input['tipoMovimiento'] ?? 'Ingreso';
        $concepto = $input['concepto'] ?? '';
        $monto = isset($input['monto']) ? (float)$input['monto'] : 0.0;
        $idUsu = 1;

        if ($idTurno <= 0 || empty($concepto) || $monto <= 0) {
            send_response(["success" => false, "message" => "Datos inválidos para el movimiento."], 400);
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO movimientos_caja (idTurno, tipoMovimiento, concepto, monto, idUsu) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$idTurno, $tipo, $concepto, $monto, $idUsu]);
            send_response(["success" => true, "idMovCaja" => (int)$pdo->lastInsertId()]);
        } catch (Exception $e) {
            send_response(["success" => false, "message" => "Error al registrar movimiento: " . $e->getMessage()], 500);
        }
    }
}

// Handle CRUD for /comprobantes
if (strpos($route, '/comprobantes') === 0) {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT c.idComp, c.tipoComp, c.numeroComp, c.fechaEmision, c.idVenta, c.totalComp, v.fechaVenta, u.nombreUsu as userName
                             FROM comprobantes c
                             JOIN ventas v ON c.idVenta = v.idVenta
                             LEFT JOIN usuario u ON v.idUsu = u.idUsu
                             ORDER BY c.fechaEmision DESC");
        $comps = $stmt->fetchAll();
        foreach ($comps as &$c) {
            $c['idComp'] = (int)$c['idComp'];
            $c['idVenta'] = (int)$c['idVenta'];
            $c['totalComp'] = (float)$c['totalComp'];
            
            // Get details from venta
            $stmtDet = $pdo->prepare("SELECT d.idProd as productId, p.nombreProd as productName, d.cantidad as quantity, d.precioUnitario as price, d.subtotal as subtotal 
                                      FROM detalle_venta d
                                      LEFT JOIN productos p ON d.idProd = p.idProd
                                      WHERE d.idVenta = ?");
            $stmtDet->execute([$c['idVenta']]);
            $c['details'] = $stmtDet->fetchAll();
            foreach ($c['details'] as &$d) {
                $d['quantity'] = (int)$d['quantity'];
                $d['price'] = (float)$d['price'];
                $d['subtotal'] = (float)$d['subtotal'];
            }
        }
        send_response($comps);
    }
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $idVenta = isset($input['idVenta']) ? (int)$input['idVenta'] : 0;
        $tipoComp = $input['tipoComp'] ?? 'Ticket';
        
        if ($idVenta <= 0) {
            send_response(["success" => false, "message" => "ID de Venta inválido"], 400);
        }
        
        try {
            $pdo->beginTransaction();
            
            // Validate if comprobante already exists for this sale
            $check = $pdo->prepare("SELECT idComp, numeroComp FROM comprobantes WHERE idVenta = ? LIMIT 1");
            $check->execute([$idVenta]);
            $existing = $check->fetch();
            if ($existing) {
                $pdo->rollBack();
                send_response(["success" => true, "idComp" => (int)$existing['idComp'], "numeroComp" => $existing['numeroComp'], "message" => "Comprobante ya existente"]);
            }
            
            // Get sale total
            $getVenta = $pdo->prepare("SELECT totalVenta FROM ventas WHERE idVenta = ?");
            $getVenta->execute([$idVenta]);
            $venta = $getVenta->fetch();
            if (!$venta) {
                $pdo->rollBack();
                send_response(["success" => false, "message" => "Venta no encontrada"], 404);
            }
            $total = $venta['totalVenta'];
            
            // Generate receipt number (mock logic)
            $prefix = '';
            switch($tipoComp) {
                case 'Factura A': $prefix = 'A-0001-'; break;
                case 'Factura B': $prefix = 'B-0001-'; break;
                case 'Factura C': $prefix = 'C-0001-'; break;
                default: $prefix = 'T-0001-'; break;
            }
            $numComp = $prefix . str_pad($idVenta, 8, '0', STR_PAD_LEFT);
            
            $stmt = $pdo->prepare("INSERT INTO comprobantes (tipoComp, numeroComp, idVenta, totalComp) VALUES (?, ?, ?, ?)");
            $stmt->execute([$tipoComp, $numComp, $idVenta, $total]);
            
            $pdo->commit();
            send_response(["success" => true, "idComp" => (int)$pdo->lastInsertId(), "numeroComp" => $numComp]);
        } catch (Exception $e) {
            $pdo->rollBack();
            send_response(["success" => false, "message" => "Error al emitir comprobante: " . $e->getMessage()], 500);
        }
    }
}

// =============================================================
// AUTO-CREATE TABLES FOR ROLES / PERMISOS (run once per request)
// =============================================================
$pdo->exec("ALTER TABLE usuario MODIFY CUILUsu VARCHAR(20) NULL;");
$pdo->exec("ALTER TABLE usuario MODIFY rolUsu ENUM('Administrador', 'Empleado', 'Cliente') NOT NULL DEFAULT 'Cliente';");
$pdo->exec("
CREATE TABLE IF NOT EXISTS `roles` (
  `idRol`        INT NOT NULL AUTO_INCREMENT,
  `nombreRol`    VARCHAR(100) NOT NULL,
  `fechaCreaRol` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idRol`),
  UNIQUE KEY `uk_roles_nombre` (`nombreRol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dashboard_permisos` (
  `idDashPer`         INT NOT NULL AUTO_INCREMENT,
  `nombreDashPer`     VARCHAR(100) NOT NULL,
  `fechaCreaDashPer`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idDashPer`),
  UNIQUE KEY `uk_dashboard_permisos_nombre` (`nombreDashPer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rol_permiso` (
  `idRol`     INT NOT NULL,
  `idDashPer` INT NOT NULL,
  PRIMARY KEY (`idRol`, `idDashPer`),
  FOREIGN KEY (`idRol`)     REFERENCES `roles`(`idRol`)   ON DELETE CASCADE,
  FOREIGN KEY (`idDashPer`) REFERENCES `dashboard_permisos`(`idDashPer`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `usuario_rol` (
  `idUsu` INT NOT NULL,
  `idRol` INT NOT NULL,
  PRIMARY KEY (`idUsu`, `idRol`),
  FOREIGN KEY (`idUsu`) REFERENCES `usuario`(`idUsu`) ON DELETE CASCADE,
  FOREIGN KEY (`idRol`) REFERENCES `roles`(`idRol`)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Seed default permissions and roles if tables are empty
$countPerms = $pdo->query("SELECT COUNT(*) FROM dashboard_permisos")->fetchColumn();
if ((int)$countPerms === 0) {
    $defaultPerms = [
        'Acceder al Dashboard', 'Gestionar Stock', 'Gestionar Recetas',
        'Gestionar Pedidos', 'Gestionar Ventas', 'Gestionar Clientes', 'Gestionar Roles', 'Ver Historial de Ventas'
    ];
    $stmtP = $pdo->prepare("INSERT IGNORE INTO dashboard_permisos (nombreDashPer) VALUES (?)");
    foreach ($defaultPerms as $pname) {
        $stmtP->execute([$pname]);
    }
}

$countRoles = $pdo->query("SELECT COUNT(*) FROM roles")->fetchColumn();
if ((int)$countRoles === 0) {
    // Get permission ids
    $permRows = $pdo->query("SELECT idDashPer, nombreDashPer FROM dashboard_permisos")->fetchAll();
    $permByName = [];
    foreach ($permRows as $pr) { $permByName[$pr['nombreDashPer']] = $pr['idDashPer']; }

    $defaultRoles = [
        'Administrador' => array_values($permByName),
        'Empleado'      => array_filter(array_map(fn($n) => $permByName[$n] ?? null,
                            ['Acceder al Dashboard','Gestionar Stock','Gestionar Pedidos','Gestionar Ventas','Gestionar Clientes','Ver Historial de Ventas'])),
        'Cliente'       => array_filter(array_map(fn($n) => $permByName[$n] ?? null,
                            ['Acceder al Dashboard','Gestionar Pedidos'])),
    ];

    $stmtR  = $pdo->prepare("INSERT IGNORE INTO roles (nombreRol) VALUES (?)");
    $stmtRP = $pdo->prepare("INSERT IGNORE INTO rol_permiso (idRol, idDashPer) VALUES (?, ?)");
    foreach ($defaultRoles as $rname => $permIds) {
        $stmtR->execute([$rname]);
        $rolId = $pdo->lastInsertId();
        if ($rolId > 0) {
            foreach ($permIds as $pid) {
                $stmtRP->execute([$rolId, $pid]);
            }
        }
    }
}

// Dynamic migration block: Check and insert 'Ver Historial de Ventas' if not exists, and assign to roles
try {
    $hasHistorial = $pdo->query("SELECT idDashPer FROM dashboard_permisos WHERE nombreDashPer = 'Ver Historial de Ventas'")->fetchColumn();
    if (!$hasHistorial) {
        $pdo->exec("INSERT INTO dashboard_permisos (nombreDashPer) VALUES ('Ver Historial de Ventas')");
        $hasHistorial = $pdo->lastInsertId();
    }
    if ($hasHistorial) {
        // Admin role (id 1)
        $adminRoleExists = $pdo->query("SELECT COUNT(*) FROM roles WHERE idRol = 1")->fetchColumn();
        if ($adminRoleExists) {
            $hasRel = $pdo->query("SELECT COUNT(*) FROM rol_permiso WHERE idRol = 1 AND idDashPer = $hasHistorial")->fetchColumn();
            if (!$hasRel) {
                $pdo->exec("INSERT IGNORE INTO rol_permiso (idRol, idDashPer) VALUES (1, $hasHistorial)");
            }
        }
    }
    
    // Dynamic migration block: Check and insert 'Modificar Mi Perfil' if not exists, and assign to admin
    $hasPerfilPerm = $pdo->query("SELECT idDashPer FROM dashboard_permisos WHERE nombreDashPer = 'Modificar Mi Perfil'")->fetchColumn();
    if (!$hasPerfilPerm) {
        $pdo->exec("INSERT INTO dashboard_permisos (nombreDashPer) VALUES ('Modificar Mi Perfil')");
        $hasPerfilPerm = $pdo->lastInsertId();
    }
    if ($hasPerfilPerm) {
        $adminRoleExists = $pdo->query("SELECT COUNT(*) FROM roles WHERE idRol = 1")->fetchColumn();
        if ($adminRoleExists) {
            $hasRel = $pdo->query("SELECT COUNT(*) FROM rol_permiso WHERE idRol = 1 AND idDashPer = $hasPerfilPerm")->fetchColumn();
            if (!$hasRel) {
                $pdo->exec("INSERT IGNORE INTO rol_permiso (idRol, idDashPer) VALUES (1, $hasPerfilPerm)");
            }
        }
    }

    if ($hasHistorial) {
        // Empleado role (id 2)
        $empleadoRoleExists = $pdo->query("SELECT COUNT(*) FROM roles WHERE idRol = 2")->fetchColumn();
        if ($empleadoRoleExists) {
            $hasRel = $pdo->query("SELECT COUNT(*) FROM rol_permiso WHERE idRol = 2 AND idDashPer = $hasHistorial")->fetchColumn();
            if (!$hasRel) {
                $pdo->exec("INSERT IGNORE INTO rol_permiso (idRol, idDashPer) VALUES (2, $hasHistorial)");
            }
        }
    }
} catch (Exception $e) {
    // Suppress DB errors here during request lifecycle
}

// =============================================================
// CRUD /permisos
// =============================================================
if ($route === '/permisos') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT p.idDashPer as id, p.nombreDashPer as name, p.fechaCreaDashPer as created_at,
                JSON_ARRAYAGG(JSON_OBJECT('id', r.idRol, 'name', r.nombreRol)) as roles_json
                FROM dashboard_permisos p
                LEFT JOIN rol_permiso rp ON rp.idDashPer = p.idDashPer
                LEFT JOIN roles r ON r.idRol = rp.idRol
                WHERE p.idDashPer = ?
                GROUP BY p.idDashPer");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) send_response(['success' => false, 'message' => 'Permiso no encontrado'], 404);
            $row['id'] = (int)$row['id'];
            $rolesArr = json_decode($row['roles_json'] ?? '[]', true);
            $row['roles'] = array_values(array_filter($rolesArr, fn($r) => $r['id'] !== null));
            unset($row['roles_json']);
            send_response($row);
        }

        // Paged list with search
        $search      = '%' . ($_GET['search']['value'] ?? $_GET['search'] ?? '') . '%';
        $start       = (int)($_GET['start'] ?? 0);
        $length      = (int)($_GET['length'] ?? 10);
        $draw        = (int)($_GET['draw'] ?? 1);

        $total = (int)$pdo->query("SELECT COUNT(*) FROM dashboard_permisos")->fetchColumn();

        $stmtF = $pdo->prepare("SELECT COUNT(*) FROM dashboard_permisos WHERE nombreDashPer LIKE ?");
        $stmtF->execute([$search]);
        $filtered = (int)$stmtF->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT p.idDashPer as id, p.nombreDashPer as name, p.fechaCreaDashPer as created_at,
                COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT('id', r.idRol, 'name', r.nombreRol))
                          FROM rol_permiso rp2
                          JOIN roles r ON r.idRol = rp2.idRol
                          WHERE rp2.idDashPer = p.idDashPer), '[]') AS roles_json
             FROM dashboard_permisos p
             WHERE p.nombreDashPer LIKE ?
             ORDER BY p.idDashPer ASC
             LIMIT ?, ?"
        );
        $stmt->execute([$search, $start, $length]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['roles'] = json_decode($row['roles_json'] ?? '[]', true);
            unset($row['roles_json']);
        }
        send_response(['draw' => $draw, 'recordsTotal' => $total, 'recordsFiltered' => $filtered, 'data' => $rows]);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id   = isset($input['id']) ? (int)$input['id'] : 0;
        $name = trim($input['name'] ?? '');
        if (empty($name)) send_response(['success' => false, 'message' => 'El nombre es obligatorio'], 400);

        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE dashboard_permisos SET nombreDashPer = ? WHERE idDashPer = ?");
                $stmt->execute([$name, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO dashboard_permisos (nombreDashPer) VALUES (?)");
                $stmt->execute([$name]);
                $id = (int)$pdo->lastInsertId();
            }
            send_response(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            if ($e->getCode() == '23000') {
                send_response(['success' => false, 'message' => 'Ya existe un permiso con ese nombre'], 400);
            }
            send_response(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) send_response(['success' => false, 'message' => 'ID no proporcionado'], 400);
        try {
            $pdo->prepare("DELETE FROM dashboard_permisos WHERE idDashPer = ?")->execute([$id]);
            send_response(['success' => true]);
        } catch (Exception $e) {
            send_response(['success' => false, 'message' => 'No se puede eliminar: ' . $e->getMessage()], 400);
        }
    }
}

// =============================================================
// CRUD /roles
// =============================================================
if ($route === '/roles') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            // Single role with permissions and users
            $stmt = $pdo->prepare("SELECT idRol as id, nombreRol as name, fechaCreaRol as created_at FROM roles WHERE idRol = ?");
            $stmt->execute([$id]);
            $role = $stmt->fetch();
            if (!$role) send_response(['success' => false, 'message' => 'Rol no encontrado'], 404);
            $role['id'] = (int)$role['id'];

            $stmtP = $pdo->prepare("SELECT p.idDashPer as id, p.nombreDashPer as name, rp.puede_ver, rp.puede_crear, rp.puede_modificar, rp.puede_eliminar FROM rol_permiso rp JOIN dashboard_permisos p ON p.idDashPer = rp.idDashPer WHERE rp.idRol = ?");
            $stmtP->execute([$id]);
            $role['permissions'] = array_map(fn($p) => ['id' => (int)$p['id'], 'name' => $p['name'], 'can_read' => (bool)$p['puede_ver'], 'can_create' => (bool)$p['puede_crear'], 'can_update' => (bool)$p['puede_modificar'], 'can_delete' => (bool)$p['puede_eliminar']], $stmtP->fetchAll());

            $stmtU = $pdo->prepare("SELECT u.idUsu as id, CONCAT(u.nombreUsu, IF(u.apellidoUsu != '' AND u.apellidoUsu != '-', CONCAT(' ', u.apellidoUsu), '')) as name, u.correoUsu as email FROM usuario_rol ur JOIN usuario u ON u.idUsu = ur.idUsu WHERE ur.idRol = ?");
            $stmtU->execute([$id]);
            $role['users'] = array_map(fn($u) => ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email']], $stmtU->fetchAll());

            send_response($role);
        }

        // List all roles with permissions and user counts
        $stmt = $pdo->query("SELECT r.idRol as id, r.nombreRol as name, r.fechaCreaRol as created_at FROM roles r ORDER BY r.idRol ASC");
        $roles = $stmt->fetchAll();
        foreach ($roles as &$role) {
            $role['id'] = (int)$role['id'];

            $stmtP = $pdo->prepare("SELECT p.idDashPer as id, p.nombreDashPer as name, rp.puede_ver, rp.puede_crear, rp.puede_modificar, rp.puede_eliminar FROM rol_permiso rp JOIN dashboard_permisos p ON p.idDashPer = rp.idDashPer WHERE rp.idRol = ?");
            $stmtP->execute([$role['id']]);
            $role['permissions'] = array_map(fn($p) => ['id' => (int)$p['id'], 'name' => $p['name'], 'can_read' => (bool)$p['puede_ver'], 'can_create' => (bool)$p['puede_crear'], 'can_update' => (bool)$p['puede_modificar'], 'can_delete' => (bool)$p['puede_eliminar']], $stmtP->fetchAll());

            $stmtU = $pdo->prepare("SELECT u.idUsu as id, CONCAT(u.nombreUsu, IF(u.apellidoUsu != '' AND u.apellidoUsu != '-', CONCAT(' ', u.apellidoUsu), '')) as name, u.correoUsu as email FROM usuario_rol ur JOIN usuario u ON u.idUsu = ur.idUsu WHERE ur.idRol = ?");
            $stmtU->execute([$role['id']]);
            $role['users'] = array_map(fn($u) => ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email']], $stmtU->fetchAll());
        }
        send_response(['recordsTotal' => count($roles), 'recordsFiltered' => count($roles), 'data' => $roles]);
    }

    if ($method === 'POST') {
        $input      = json_decode(file_get_contents('php://input'), true);
        $id         = isset($input['id']) ? (int)$input['id'] : 0;
        $name       = trim($input['name'] ?? '');
        $permissions = $input['permissions'] ?? [];

        if (empty($name)) send_response(['success' => false, 'message' => 'El nombre es obligatorio'], 400);

        try {
            $pdo->beginTransaction();
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE roles SET nombreRol = ? WHERE idRol = ?");
                $stmt->execute([$name, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO roles (nombreRol) VALUES (?)");
                $stmt->execute([$name]);
                $id = (int)$pdo->lastInsertId();
            }
            // Sync permissions
            $pdo->prepare("DELETE FROM rol_permiso WHERE idRol = ?")->execute([$id]);
            $stmtRP = $pdo->prepare("INSERT IGNORE INTO rol_permiso (idRol, idDashPer, puede_ver, puede_crear, puede_modificar, puede_eliminar) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($permissions as $p) {
                $pid = (int)($p['id'] ?? 0);
                if ($pid > 0) {
                    $canRead = !empty($p['can_read']) ? 1 : 0;
                    $canCreate = !empty($p['can_create']) ? 1 : 0;
                    $canUpdate = !empty($p['can_update']) ? 1 : 0;
                    $canDelete = !empty($p['can_delete']) ? 1 : 0;
                    // Always fallback to true if passing old permissionIds format (backward compatibility)
                    if (isset($p['can_read']) === false) {
                        $canRead = $canCreate = $canUpdate = $canDelete = 1;
                    }
                    $stmtRP->execute([$id, $pid, $canRead, $canCreate, $canUpdate, $canDelete]);
                }
            }
            // Backward compatibility for permissionIds format
            if (empty($permissions) && !empty($input['permissionIds'])) {
                foreach ($input['permissionIds'] as $pid) {
                    $pid = (int)$pid;
                    if ($pid > 0) {
                        $stmtRP->execute([$id, $pid, 1, 1, 1, 1]);
                    }
                }
            }
            $pdo->commit();
            send_response(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if ($e->getCode() == '23000') send_response(['success' => false, 'message' => 'Ya existe un rol con ese nombre'], 400);
            send_response(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) send_response(['success' => false, 'message' => 'ID no proporcionado'], 400);
        // Check if role has users
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuario_rol WHERE idRol = ?");
        $stmt->execute([$id]);
        if ((int)$stmt->fetchColumn() > 0) {
            send_response(['success' => false, 'message' => 'No se puede eliminar el rol porque tiene usuarios asignados. Reasigná los usuarios primero.'], 400);
        }
        try {
            $pdo->prepare("DELETE FROM roles WHERE idRol = ?")->execute([$id]);
            send_response(['success' => true]);
        } catch (Exception $e) {
            send_response(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }
}

// =============================================================
// CRUD /usuarios
// =============================================================
if ($route === '/usuarios') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT idUsu as id, CONCAT(nombreUsu, IF(apellidoUsu != '' AND apellidoUsu != '-', CONCAT(' ', apellidoUsu), '')) as name, correoUsu as email, estadoUsu as status, rolUsu as role_str, telefonoUsu as phone, usuarioUsu as username, fechaNacUsu as dob, direccionUsu as address FROM usuario WHERE idUsu = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            if (!$user) send_response(['success' => false, 'message' => 'Usuario no encontrado'], 404);
            $user['id'] = (int)$user['id'];

            $stmtR = $pdo->prepare("SELECT r.idRol as id, r.nombreRol as name FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE ur.idUsu = ?");
            $stmtR->execute([$id]);
            $user['roles'] = array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'permissions' => [], 'users' => []], $stmtR->fetchAll());

            send_response($user);
        }

        // Paged list with search
        $search  = '%' . ($_GET['search']['value'] ?? $_GET['search'] ?? '') . '%';
        $start   = (int)($_GET['start'] ?? 0);
        $length  = (int)($_GET['length'] ?? 10);
        $draw    = (int)($_GET['draw'] ?? 1);
        $roleFilter = $_GET['roleFilter'] ?? '';

        $total = (int)$pdo->query("SELECT COUNT(*) FROM usuario")->fetchColumn();

        $roleCondition = '';
        $roleParams = [];
        if (!empty($roleFilter)) {
            $roleCondition = " AND idUsu IN (SELECT ur.idUsu FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE r.nombreRol = ?) ";
            $roleParams[] = $roleFilter;
        }

        $stmtF = $pdo->prepare("SELECT COUNT(*) FROM usuario WHERE (nombreUsu LIKE ? OR correoUsu LIKE ? OR apellidoUsu LIKE ?)" . $roleCondition);
        $stmtF->execute(array_merge([$search, $search, $search], $roleParams));
        $filtered = (int)$stmtF->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT idUsu as id,
                CONCAT(nombreUsu, IF(apellidoUsu != '' AND apellidoUsu != '-', CONCAT(' ', apellidoUsu), '')) as name,
                correoUsu as email,
                estadoUsu as status,
                telefonoUsu as phone,
                usuarioUsu as username,
                fechaNacUsu as dob,
                direccionUsu as address
             FROM usuario
             WHERE (nombreUsu LIKE ? OR correoUsu LIKE ? OR apellidoUsu LIKE ?)" . $roleCondition . "
             ORDER BY FIELD(estadoUsu, 'Activo', 'Inactivo'), idUsu ASC
             LIMIT ?, ?"
        );
        $stmt->execute(array_merge([$search, $search, $search], $roleParams, [$start, $length]));
        $users = $stmt->fetchAll();

        foreach ($users as &$user) {
            $user['id'] = (int)$user['id'];
            $stmtR = $pdo->prepare("SELECT r.idRol as id, r.nombreRol as name FROM usuario_rol ur JOIN roles r ON r.idRol = ur.idRol WHERE ur.idUsu = ?");
            $stmtR->execute([$user['id']]);
            $user['roles'] = array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'permissions' => [], 'users' => []], $stmtR->fetchAll());
            $user['last_login_at'] = null;
            $user['created_at']    = date('c');
        }
        send_response(['draw' => $draw, 'recordsTotal' => $total, 'recordsFiltered' => $filtered, 'data' => $users]);
    }

    if ($method === 'POST') {
        $input   = json_decode(file_get_contents('php://input'), true);
        $id      = isset($input['id']) ? (int)$input['id'] : 0;
        $name    = trim($input['name'] ?? '');
        $firstname = trim($input['firstname'] ?? '');
        $lastname  = trim($input['lastname'] ?? '');
        if (empty($firstname) && empty($lastname) && !empty($name)) {
            $parts = explode(' ', $name, 2);
            $firstname = $parts[0] ?? '';
            $lastname = $parts[1] ?? '-';
        }
        $email   = trim($input['email'] ?? '');
        $password= trim($input['password'] ?? '');
        $phone   = trim($input['phone'] ?? '');
        $username= trim($input['username'] ?? '');
        $dob     = trim($input['dob'] ?? '');
        $address = isset($input['address']) && is_array($input['address']) ? json_encode($input['address']) : null;
        $status  = trim($input['status'] ?? 'Activo');
        $roleIds = array_map('intval', $input['roleIds'] ?? array_map(fn($r) => $r['id'] ?? 0, $input['roles'] ?? []));

        if (empty($name) || empty($email)) {
            send_response(['success' => false, 'message' => 'Nombre y email son obligatorios'], 400);
        }

        try {
            $pdo->beginTransaction();

            if ($id > 0) {
                // UPDATE existing user
                $updateQuery = "UPDATE usuario SET nombreUsu = ?, apellidoUsu = ?, correoUsu = ?, telefonoUsu = ?, usuarioUsu = ?, fechaNacUsu = ?, direccionUsu = ?, estadoUsu = ?";
                $params = [$firstname, $lastname, $email, $phone, $username, $dob ?: null, $address, $status];

                if (!empty($password)) {
                    $updateQuery .= ", contrasenaUsu = ?";
                    $params[] = password_hash($password, PASSWORD_DEFAULT);
                }

                $updateQuery .= " WHERE idUsu = ?";
                $params[] = $id;

                $stmt = $pdo->prepare($updateQuery);
                $stmt->execute($params);
            } else {
                // CREATE new user
                if (empty($password)) $password = 'Pujol2026!';
                $hashedPw = password_hash($password, PASSWORD_DEFAULT);

                // Generate unique username from email
                $username = preg_replace('/[^a-zA-Z0-9_.]/', '', explode('@', $email)[0]);
                $base = $username; $c = 1;
                do {
                    $stmtUsr = $pdo->prepare("SELECT idUsu FROM usuario WHERE usuarioUsu = ?");
                    $stmtUsr->execute([$username]);
                    if ($stmtUsr->fetch()) { $username = $base . $c++; } else break;
                } while (true);

                // Generate unique CUIL placeholder only for Admin (1) or Empleado (2)
                $isAdminOrEmployee = false;
                foreach ($roleIds as $rid) {
                    if ($rid === 1 || $rid === 2) {
                        $isAdminOrEmployee = true;
                        break;
                    }
                }
                $cuil = $isAdminOrEmployee ? ('20' . str_pad(mt_rand(10000000, 99999999), 8, '0', STR_PAD_LEFT) . '9') : null;

                $stmt = $pdo->prepare("INSERT INTO usuario (nombreUsu, apellidoUsu, correoUsu, usuarioUsu, contrasenaUsu, CUILUsu, telefonoUsu, estadoUsu, rolUsu) VALUES (?, ?, ?, ?, ?, ?, '', 'Activo', 'Cliente')");
                $stmt->execute([$firstname, $lastname, $email, $username, $hashedPw, $cuil]);
                $id = (int)$pdo->lastInsertId();
            }

            // Sync roles in usuario_rol
            $pdo->prepare("DELETE FROM usuario_rol WHERE idUsu = ?")->execute([$id]);
            $stmtUR = $pdo->prepare("INSERT IGNORE INTO usuario_rol (idUsu, idRol) VALUES (?, ?)");
            $firstRoleName = null;
            foreach ($roleIds as $rid) {
                if ($rid > 0) {
                    $stmtUR->execute([$id, $rid]);
                    if (!$firstRoleName) {
                        $stmtRN = $pdo->prepare("SELECT nombreRol FROM roles WHERE idRol = ?");
                        $stmtRN->execute([$rid]);
                        $firstRoleName = $stmtRN->fetchColumn();
                    }
                }
            }
            // Also update rolUsu column for display
            if ($firstRoleName) {
                $pdo->prepare("UPDATE usuario SET rolUsu = ? WHERE idUsu = ?")->execute([$firstRoleName, $id]);
            }

            $pdo->commit();
            send_response(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if ($e->getCode() == '23000') {
                send_response(['success' => false, 'message' => 'El email o usuario ya está registrado en el sistema'], 400);
            }
            send_response(['success' => false, 'message' => 'Error al guardar el usuario: ' . $e->getMessage()], 500);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) send_response(['success' => false, 'message' => 'ID no proporcionado'], 400);
        try {
            $pdo->prepare("UPDATE usuario SET estadoUsu = 'Inactivo' WHERE idUsu = ?")->execute([$id]);
            send_response(['success' => true]);
        } catch (Exception $e) {
            send_response(['success' => false, 'message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }
}

// 404 Route handler
send_response(["success" => false, "message" => "Ruta no encontrada"], 404);
