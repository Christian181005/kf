<?php
header('Content-Type: application/json');

// Sicherer Pfad außerhalb des Webroots
$jsonPath = '/var/www/secure_data/output_data.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($jsonPath)) {
        echo file_get_contents($jsonPath);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Datei nicht gefunden"]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    if ($input && json_decode($input) !== null) {
        file_put_contents($jsonPath, $input);
        echo json_encode(["status" => "success"]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Ungültiges JSON"]);
    }
    exit;
}

http_response_code(405); // Method Not Allowed
echo json_encode(["error" => "Nur GET oder POST erlaubt"]);
?>
