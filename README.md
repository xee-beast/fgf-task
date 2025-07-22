## Installation

1. **Clone/Download** the project files to your web server directory:
   ```bash
   git clone <repository-url>
   cd task-manager
   ```

2. **Set Permissions** (if on Linux/Mac):
   ```bash
   chmod 755 database/
   chmod 644 database/tasks.db
   ```

3. **Start Web Server**:
   
   **Option A - PHP Built-in Server (for development):**
   ```bash
   php -S localhost:8000
   ```
   
   **Option B - Apache/Nginx:**
   - Place files in your web root directory
   - Ensure PHP is configured and running

4. **Access the Application**:
   - Open your browser and navigate to `http://localhost:8000`
   - The database will be created automatically on first run
