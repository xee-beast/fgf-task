// Enhanced Drag and Drop functionality for Task Manager
class DragDropManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.draggedElement = null;
        this.draggedOverColumn = null;
        this.placeholder = null;
        this.init();
    }

    init() {
        this.setupDragAndDrop();
        this.setupTouchSupport();
        this.createPlaceholder();
    }

    createPlaceholder() {
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'task-placeholder';
        this.placeholder.innerHTML = '<div class="placeholder-content">Drop here</div>';
        this.placeholder.style.display = 'none';
    }

    setupDragAndDrop() {
        // Use event delegation for dynamically created elements
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('dragenter', this.handleDragEnter.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));

        // Make sure newly created tasks are draggable
        this.observeTaskCreation();
    }

    observeTaskCreation() {
        // Use MutationObserver to watch for new task elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('task-item')) {
                        this.makeDraggable(node);
                    }
                });
            });
        });

        // Observe all task columns
        document.querySelectorAll('.task-column').forEach(column => {
            observer.observe(column, { childList: true, subtree: true });
        });
    }

    makeDraggable(taskElement) {
        taskElement.draggable = true;
        taskElement.style.cursor = 'grab';

        // Add visual feedback
        taskElement.addEventListener('mousedown', () => {
            taskElement.style.cursor = 'grabbing';
        });

        taskElement.addEventListener('mouseup', () => {
            taskElement.style.cursor = 'grab';
        });
    }

    handleDragStart(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        this.draggedElement = taskItem;
        taskItem.classList.add('dragging');

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', taskItem.outerHTML);
        e.dataTransfer.setData('text/plain', taskItem.dataset.taskId);

        // Create drag image
        const dragImage = taskItem.cloneNode(true);
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'rotate(5deg)';
        document.body.appendChild(dragImage);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        e.dataTransfer.setDragImage(dragImage, 0, 0);

        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);

        console.log('Drag started for task:', taskItem.dataset.taskId);
    }

    handleDragEnd(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        taskItem.classList.remove('dragging');
        taskItem.style.cursor = 'grab';
        this.draggedElement = null;

        // Remove drag-over classes from all columns
        document.querySelectorAll('.task-column').forEach(column => {
            column.classList.remove('drag-over');
        });

        // Hide placeholder
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.style.display = 'none';
        }

        console.log('Drag ended');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const column = e.target.closest('.task-column');
        if (!column || !this.draggedElement) return;

        // Show placeholder at appropriate position
        this.updatePlaceholderPosition(e, column);
    }

    handleDragEnter(e) {
        const column = e.target.closest('.task-column');
        if (!column || !this.draggedElement) return;

        // Add visual feedback to column
        document.querySelectorAll('.task-column').forEach(col => {
            col.classList.remove('drag-over');
        });
        column.classList.add('drag-over');
        this.draggedOverColumn = column;

        console.log('Drag entered column:', column.dataset.status);
    }

    handleDragLeave(e) {
        const column = e.target.closest('.task-column');
        if (!column) return;

        // Check if we're actually leaving the column (not just moving to a child)
        const rect = column.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            column.classList.remove('drag-over');
            if (this.placeholder && this.placeholder.parentNode === column) {
                this.placeholder.style.display = 'none';
            }
        }
    }

    updatePlaceholderPosition(e, column) {
        if (!this.placeholder) return;

        const tasks = Array.from(column.querySelectorAll('.task-item:not(.dragging)'));
        const emptyState = column.querySelector('.empty-state');

        // Remove empty state if it exists
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        if (tasks.length === 0) {
            // Empty column - show placeholder at the top
            column.appendChild(this.placeholder);
            this.placeholder.style.display = 'block';
            return;
        }

        let insertBefore = null;
        const mouseY = e.clientY;

        for (let task of tasks) {
            const rect = task.getBoundingClientRect();
            const taskCenter = rect.top + rect.height / 2;

            if (mouseY < taskCenter) {
                insertBefore = task;
                break;
            }
        }

        // Insert placeholder
        if (insertBefore) {
            column.insertBefore(this.placeholder, insertBefore);
        } else {
            column.appendChild(this.placeholder);
        }

        this.placeholder.style.display = 'block';
    }

    async handleDrop(e) {
        e.preventDefault();

        const column = e.target.closest('.task-column');
        if (!column || !this.draggedElement) {
            console.log('Invalid drop - no column or dragged element');
            return;
        }

        const taskId = this.draggedElement.dataset.taskId;
        const newStatus = column.dataset.status;
        const currentStatus = this.draggedElement.dataset.status;

        console.log(`Dropping task ${taskId} from ${currentStatus} to ${newStatus}`);

        // Remove drag-over class
        column.classList.remove('drag-over');

        // Hide placeholder
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.style.display = 'none';
        }

        try {
            // Always update the task (even if status is the same, for reordering)
            await this.updateTaskStatus(taskId, newStatus);

            // Show success message
            if (newStatus !== currentStatus) {
                this.taskManager.showSuccess(`Task moved to ${newStatus}`);
            }

            // Reload tasks to reflect changes
            await this.taskManager.loadTasks();

        } catch (error) {
            console.error('Error moving task:', error);
            this.taskManager.showError('Failed to move task');
        }
    }

    async updateTaskStatus(taskId, newStatus) {
        const response = await fetch('api/update_task.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: taskId,
                status: newStatus
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to update task status');
        }

        return data;
    }

    // Enhanced touch support for mobile devices
    setupTouchSupport() {
        let touchItem = null;
        let touchOffset = { x: 0, y: 0 };
        let initialTouch = null;
        let dragThreshold = 10; // pixels to move before starting drag
        let isDragging = false;

        document.addEventListener('touchstart', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            touchItem = taskItem;
            initialTouch = e.touches[0];
            const rect = touchItem.getBoundingClientRect();

            touchOffset.x = initialTouch.clientX - rect.left;
            touchOffset.y = initialTouch.clientY - rect.top;
            isDragging = false;

            // Prevent scrolling when touching a task
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!touchItem || !initialTouch) return;

            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - initialTouch.clientX);
            const deltaY = Math.abs(touch.clientY - initialTouch.clientY);

            // Start dragging if moved beyond threshold
            if (!isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
                isDragging = true;
                touchItem.classList.add('dragging');
                console.log('Touch drag started');
            }

            if (!isDragging) return;

            e.preventDefault();

            // Position the item
            touchItem.style.position = 'fixed';
            touchItem.style.left = (touch.clientX - touchOffset.x) + 'px';
            touchItem.style.top = (touch.clientY - touchOffset.y) + 'px';
            touchItem.style.zIndex = '1000';
            touchItem.style.transform = 'rotate(5deg) scale(1.05)';
            touchItem.style.opacity = '0.9';

            // Find column under touch
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const column = elementBelow?.closest('.task-column');

            // Update column highlighting
            document.querySelectorAll('.task-column').forEach(col => {
                col.classList.remove('drag-over');
            });

            if (column && column !== touchItem.closest('.task-column')) {
                column.classList.add('drag-over');
            }
        }, { passive: false });

        document.addEventListener('touchend', async (e) => {
            if (!touchItem) return;

            if (isDragging) {
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const column = elementBelow?.closest('.task-column');

                console.log('Touch drag ended');

                if (column) {
                    const taskId = touchItem.dataset.taskId;
                    const newStatus = column.dataset.status;
                    const currentStatus = touchItem.dataset.status;

                    if (newStatus !== currentStatus) {
                        try {
                            await this.updateTaskStatus(taskId, newStatus);
                            this.taskManager.showSuccess(`Task moved to ${newStatus}`);
                            await this.taskManager.loadTasks();
                        } catch (error) {
                            console.error('Error in touch drop:', error);
                            this.taskManager.showError('Failed to move task');
                        }
                    }
                }
            }

            // Reset styles
            if (touchItem) {
                touchItem.style.position = '';
                touchItem.style.left = '';
                touchItem.style.top = '';
                touchItem.style.zIndex = '';
                touchItem.style.transform = '';
                touchItem.style.opacity = '';
                touchItem.classList.remove('dragging');
            }

            // Remove highlighting
            document.querySelectorAll('.task-column').forEach(col => {
                col.classList.remove('drag-over');
            });

            // Reset variables
            touchItem = null;
            initialTouch = null;
            isDragging = false;
        });
    }
}

// Enhanced app.js integration
document.addEventListener('DOMContentLoaded', () => {
    // Wait for taskManager to be initialized
    const initDragDrop = () => {
        if (window.taskManager) {
            window.dragDropManager = new DragDropManager(window.taskManager);
            console.log('Drag and drop initialized');
        } else {
            setTimeout(initDragDrop, 100);
        }
    };
    initDragDrop();
});

// Make sure tasks are draggable when they're rendered
document.addEventListener('tasksRendered', () => {
    if (window.dragDropManager) {
        // Make all task items draggable
        document.querySelectorAll('.task-item').forEach(task => {
            window.dragDropManager.makeDraggable(task);
        });
    }
});