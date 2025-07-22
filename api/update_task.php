<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

require_once '../config/database.php';


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
	if (empty($input['id'])) {
		echo json_encode([
			'success' => false,
			'message' => 'Task ID is required'
		]);
		exit();
	}

	$task_id = $input['id'];

	// Check if task exists
	$stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
	$stmt->execute([$task_id]);
	$existing_task = $stmt->fetch();

	if (!$existing_task) {
		echo json_encode([
			'success' => false,
			'message' => 'Task not found'
		]);
		exit();
	}

	// Prepare update data
	$update_fields = [];
	$update_values = [];

	if (isset($input['title']) && !empty(trim($input['title']))) {
		$update_fields[] = 'title = ?';
		$update_values[] = trim($input['title']);
	}

	if (isset($input['description'])) {
		$update_fields[] = 'description = ?';
		$update_values[] = trim($input['description']);
	}

	if (isset($input['status'])) {
		$valid_statuses = ['To Do', 'In Progress', 'Done'];
		if (in_array($input['status'], $valid_statuses)) {
			$update_fields[] = 'status = ?';
			$update_values[] = $input['status'];

			// If status changed, update sort order
			if ($input['status'] !== $existing_task['status']) {
				$stmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM tasks WHERE status = ?");
				$stmt->execute([$input['status']]);
				$sort_order = $stmt->fetchColumn();

				$update_fields[] = 'sort_order = ?';
				$update_values[] = $sort_order;
			}
		}
	}

	if (empty($update_fields)) {
		echo json_encode([
			'success' => false,
			'message' => 'No valid fields to update'
		]);
		exit();
	}

	// Add updated_at
	$update_fields[] = 'updated_at = datetime(\'now\')';
	$update_values[] = $task_id;

	// Build and execute update query
	$sql = "UPDATE tasks SET " . implode(', ', $update_fields) . " WHERE id = ?";
	$stmt = $pdo->prepare($sql);
	$stmt->execute($update_values);

	// Return updated task
	$stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
	$stmt->execute([$task_id]);
	$updated_task = $stmt->fetch();

	echo json_encode([
		'success' => true,
		'message' => 'Task updated successfully',
		'task' => $updated_task
	]);

} catch (Exception $e) {
	error_log("Update Task Error: " . $e->getMessage());
	echo json_encode([
		'success' => false,
		'message' => 'Failed to update task'
	]);
}
?>