<?php
header('Content-Type: application/json');

$data = file_get_contents('php://input');
$file = 'entire-API-Data/output_data_copy.json';

if (file_put_contents($file, $data)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Could not save file']);
}
?>