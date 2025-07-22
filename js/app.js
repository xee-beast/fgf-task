// Task Manager Application
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTasks();
    }

    setupEventListeners() {
        // Save task button
        document.getElementById('saveTask').addEventListener('click', () => {
            this.saveTask();
        });

        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Modal reset
        document.getElementById('taskModal').addEventListener('hidden.bs.modal', () => {
            this.resetForm();
        });
    }

    async loadTasks() {
        try {
            this.showLoading(true);
            const response = await fetch('api/tasks.php');
            const data = await response.json();

            if (data.success) {
                this.tasks = data.tasks || [];
                this.renderTasks();
                this.updateCounts();
            } else {
                this.showError('Failed to load tasks');
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Error loading tasks');
        } finally {
            this.showLoading(false);
        }
    }

    async saveTask() {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);

        const taskData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            status: formData.get('status')
        };

        if (!taskData.title) {
            this.showError('Task title is required');
            return;
        }

        try {
            this.showLoading(true);

            let url = 'api/create_task.php';
            let method = 'POST';

            if (this.currentEditId) {
                url = 'api/update_task.php';
                taskData.id = this.currentEditId;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(this.currentEditId ? 'Task updated successfully' : 'Task created successfully');
                this.hideModal();
                this.loadTasks();
            } else {
                this.showError(data.message || 'Failed to save task');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            this.showError('Error saving task');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            this.showLoading(true);

            const response = await fetch('api/delete_task.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: id })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Task deleted successfully');
                this.loadTasks();
            } else {
                this.showError(data.message || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showError('Error deleting task');
        } finally {
            this.showLoading(false);
        }
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id == id);
        if (!task) return;

        this.currentEditId = id;

        document.getElementById('taskModalLabel').textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskStatus').value = task.status;

        const modal = new bootstrap.Modal(document.getElementById('taskModal'));
        modal.show();
    }

    renderTasks() {
        const columns = {
            'To Do': document.getElementById('todo-tasks'),
            'In Progress': document.getElementById('progress-tasks'),
            'Done': document.getElementById('done-tasks')
        };

        // Clear all columns
        Object.values(columns).forEach(column => {
            column.innerHTML = '';
        });

        // Sort tasks by sort_order
        this.tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        // Group tasks by status
        const tasksByStatus = {
            'To Do': [],
            'In Progress': [],
            'Done': []
        };

        this.tasks.forEach(task => {
            if (tasksByStatus[task.status]) {
                tasksByStatus[task.status].push(task);
            }
        });

        // Render tasks in each column
        Object.keys(columns).forEach(status => {
            const column = columns[status];
            const tasks = tasksByStatus[status];

            if (tasks.length === 0) {
                column.innerHTML = '<div class="empty-state">No tasks yet</div>';
            } else {
                tasks.forEach(task => {
                    const taskElement = this.createTaskElement(task);
                    column.appendChild(taskElement);
                });
            }
        });

        // Trigger event for drag and drop initialization
        document.dispatchEvent(new CustomEvent('tasksRendered'));
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        taskDiv.draggable = true;
        taskDiv.dataset.taskId = task.id;
        taskDiv.dataset.status = task.status;

        const statusBadgeClass = {
            'To Do': 'status-todo',
            'In Progress': 'status-progress',
            'Done': 'status-done'
        }[task.status] || 'status-todo';

        const createdDate = new Date(task.created_at).toLocaleDateString();

        taskDiv.innerHTML = `
            <h6>${this.escapeHtml(task.title)}</h6>
            ${task.description ? `<p>${this.escapeHtml(task.description)}</p>` : ''}
            <div class="task-meta">
                <span class="status-badge ${statusBadgeClass}">${task.status}</span>
                <small class="text-muted">${createdDate}</small>
            </div>
            <div class="task-actions mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="taskManager.editTask(${task.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="taskManager.deleteTask(${task.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return taskDiv;
    }

    updateCounts() {
        const counts = {
            'To Do': 0,
            'In Progress': 0,
            'Done': 0
        };

        this.tasks.forEach(task => {
            if (counts.hasOwnProperty(task.status)) {
                counts[task.status]++;
            }
        });

        document.getElementById('todo-count').textContent = counts['To Do'];
        document.getElementById('progress-count').textContent = counts['In Progress'];
        document.getElementById('done-count').textContent = counts['Done'];
    }

    resetForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('taskModalLabel').textContent = 'Add New Task';
        this.currentEditId = null;
    }

    hideModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
        if (modal) {
            modal.hide();
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at the top of container
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
    // Make it globally available
    window.taskManager = taskManager;
});