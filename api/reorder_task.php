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

	if (!$input || empty($input['taskIds']) || !is_array($input['taskIds'])) {
		echo json_encode([
			'success' => false,
			'message' => 'Task IDs array is required'
		]);
		exit();
	}

	$task_ids = $input['taskIds'];
	$status = isset($input['status']) ? $input['status'] : null;

	// Start transaction
	$pdo->beginTransaction();

	try {
		// Update sort order for each task
		foreach ($task_ids as $index => $task_id) {
			$sort_order = $index + 1;

			if ($status) {
				// Update both sort order and ensure status is correct
				$stmt = $pdo->prepare("
                    UPDATE tasks 
                    SET sort_order = ?, status = ?, updated_at = datetime('now') 
                    WHERE id = ?
                ");
				$stmt->execute([$sort_order, $status, $task_id]);
			} else {
				// Update only sort order
				$stmt = $pdo->prepare("
                    UPDATE tasks 
                    SET sort_order = ?, updated_at = datetime('now') 
                    WHERE id = ?
                ");
				$stmt->execute([$sort_order, $task_id]);
			}
		}

		$pdo->commit();

		echo json_encode([
			'success' => true,
			'message' => 'Tasks reordered successfully'
		]);

	} catch (Exception $e) {
		$pdo->rollback();
		throw $e;
	}

} catch (Exception $e) {
	error_log("Reorder Tasks Error: " . $e->getMessage());
	echo json_encode([
		'success' => false,
		'message' => 'Failed to reorder tasks'
	]);
}
?>