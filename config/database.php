<?php
class Database {
	private $db_file = __DIR__ . '/../database/tasks.db';
	private $pdo = null;

	public function __construct() {
		$this->initializeDatabase();
	}

	private function initializeDatabase() {
		try {
			// Create database directory if it doesn't exist
			$db_dir = dirname($this->db_file);
			if (!is_dir($db_dir)) {
				mkdir($db_dir, 0755, true);
			}

			// Create PDO connection
			$this->pdo = new PDO('sqlite:' . $this->db_file);
			$this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

			// Create tables if they don't exist
			$this->createTables();

		} catch (PDOException $e) {
			error_log("Database connection failed: " . $e->getMessage());
			throw new Exception("Database connection failed");
		}
	}

	private function createTables() {
		$sql = "
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'To Do',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ";

		$this->pdo->exec($sql);

		// Create index for better performance
		$this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");
		$this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)");
	}

	public function getConnection() {
		return $this->pdo;
	}

	public function beginTransaction() {
		return $this->pdo->beginTransaction();
	}

	public function commit() {
		return $this->pdo->commit();
	}

	public function rollback() {
		return $this->pdo->rollback();
	}

	public function lastInsertId() {
		return $this->pdo->lastInsertId();
	}
}
?>