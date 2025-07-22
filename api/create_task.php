<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	echo json_encode([
		'success' => false,
		'message' => 'Only POST method allowed'
	]);
	exit();
}

try {
	$database = new Database();
	$pdo = $database->getConnection();

	// Get JSON input
	$input = json_decode(file_get_contents('php://input'), true);

	if (!$input) {
		echo json_encode([
			'success' => false,
			'message' => 'Invalid JSON input'
		]);
		exit();
	}

	// Validate required fields
	if (empty($input['title'])) {
		echo json_encode([
			'success' => false,
			'message' => 'Title is required'
		]);
		exit();
	}

	$title = trim($input['title']);
	$description = isset($input['description']) ? trim($input['description']) : '';
	$status = isset($input['status']) ? $input['status'] : 'To Do';

	// Validate status
	$valid_statuses = ['To Do', 'In Progress', 'Done'];
	if (!in_array($status, $valid_statuses)) {
		$status = 'To Do';
	}

	// Get next sort order for the status
	$stmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM tasks WHERE status = ?");
	$stmt->execute([$status]);
	$sort_order = $stmt->fetchColumn();

	// Insert new task
	$stmt = $pdo->prepare("
        INSERT INTO tasks (title, description, status, sort_order, created_at, updated_at) 
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ");

	$stmt->execute([$title, $description, $status, $sort_order]);

	$task_id = $pdo->lastInsertId();

	// Return the created task
	$stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
	$stmt->execute([$task_id]);
	$task = $stmt->fetch();

	echo json_encode([
		'success' => true,
		'message' => 'Task created successfully',
		'task' => $task
	]);

} catch (Exception $e) {
	error_log("Create Task Error: " . $e->getMessage());
	echo json_encode([
		'success' => false,
		'message' => 'Failed to create task'
	]);
}
?>