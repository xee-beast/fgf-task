<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

require_once '../config/database.php';

try {
	$database = new Database();
	$pdo = $database->getConnection();

	if ($_SERVER['REQUEST_METHOD'] === 'GET') {
		// Get all tasks
		$stmt = $pdo->prepare("
            SELECT id, title, description, status, sort_order, 
                   created_at, updated_at 
            FROM tasks 
            ORDER BY status, sort_order ASC, created_at DESC
        ");

		$stmt->execute();
		$tasks = $stmt->fetchAll();

		echo json_encode([
			'success' => true,
			'tasks' => $tasks
		]);

	} else {
		echo json_encode([
			'success' => false,
			'message' => 'Method not allowed'
		]);
	}

} catch (Exception $e) {
	error_log("API Error: " . $e->getMessage());
	echo json_encode([
		'success' => false,
		'message' => 'Internal server error'
	]);
}
?>