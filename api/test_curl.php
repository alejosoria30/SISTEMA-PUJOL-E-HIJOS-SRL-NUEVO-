<?php
$payload = [
    'id' => 1,
    'name' => 'First Last',
    'firstname' => 'First',
    'lastname' => 'Last',
    'email' => 'admin@demo.com',
    'password' => null,
    'roleIds' => [1],
    'username' => 'admin',
    'phone' => '123456',
    'dob' => null,
    'address' => null,
    'status' => 'Activo'
];

$ch = curl_init('http://localhost/Pujol_e_Hijos_SRL/api/usuarios');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$res = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP $httpcode\n";
echo "Response: $res\n";
