<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
	echo json_encode([
		'success' => false,
		'message' => 'Only DELETE method allowed'
	]);
	exit();
}

try {
	$database = new Database();
	$pdo = $database->getConnection();

	// Get JSON input
	$input = json_decode(file_get_contents('php://input'), true);

	if (!$input || empty($input['id'])) {
		echo json_encode([
			'success' => false,
			'message' => 'Task ID is required'
		]);
		exit();
	}

	$task_id = $input['id'];

	// Check if task exists
	$stmt = $pdo->prepare("SELECT id FROM tasks WHERE id = ?");
	$stmt->execute([$task_id]);

	if (!$stmt->fetch()) {
		echo json_encode([
			'success' => false,
			'message' => 'Task not found'
		]);
		exit();
	}

	// Delete the task
	$stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
	$stmt->execute([$task_id]);

	if ($stmt->rowCount() > 0) {
		echo json_encode([
			'success' => true,
			'message' => 'Task deleted successfully'
		]);
	} else {
		echo json_encode([
			'success' => false,
			'message' => 'Failed to delete task'
		]);
	}

} catch (Exception $e) {
	error_log("Delete Task Error: " . $e->getMessage());
	echo json_encode([
		'success' => false,
		'message' => 'Failed to delete task'
	]);
}
?>