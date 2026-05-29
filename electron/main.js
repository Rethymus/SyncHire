/**
 * Electron Main Process
 *
 * Manages the application lifecycle, spawns the Python backend,
 * and creates the main browser window.
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Configuration
const PYTHON_PORT = 8000;
const PYTHON_URL = `http://127.0.0.1:${PYTHON_PORT}`;
const FRONTEND_URL = process.env.ELECTRON_DEV === 'true'
  ? 'http://localhost:3000'
  : `file://${path.join(__dirname, '../frontend/out/index.html')}`;

let mainWindow = null;
let pythonProcess = null;

/**
 * Get the path to the bundled Python executable
 */
function getPythonPath() {
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, use the system Python
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  // In production, use the bundled Python executable
  const platform = process.platform;
  const resourcesPath = process.resourcesPath;

  if (platform === 'win32') {
    return path.join(resourcesPath, 'python', 'main_lite.exe');
  } else if (platform === 'darwin') {
    return path.join(resourcesPath, 'python', 'main_lite');
  } else {
    return path.join(resourcesPath, 'python', 'main_lite');
  }
}

/**
 * Get the working directory for the Python backend
 */
function getPythonCwd() {
  const isDev = !app.isPackaged;

  if (isDev) {
    return path.join(__dirname, '../api');
  }

  return path.join(process.resourcesPath, 'python');
}

/**
 * Start the Python FastAPI backend
 */
function startPythonBackend() {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const pythonCwd = getPythonCwd();
    const isDev = !app.isPackaged;

    console.log(`[Electron] Starting Python backend: ${pythonPath}`);
    console.log(`[Electron] Working directory: ${pythonCwd}`);

    const args = isDev ? ['-m', 'uvicorn', 'main_lite:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)] : [];

    pythonProcess = spawn(pythonPath, args, {
      cwd: pythonCwd,
      env: {
        ...process.env,
        PYTHONPATH: pythonCwd,
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Python] ${output}`);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Python] ${output}`);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('[Electron] Failed to start Python backend:', error);
      reject(error);
    });

    pythonProcess.on('exit', (code) => {
      console.log(`[Electron] Python backend exited with code ${code}`);
      pythonProcess = null;
    });

    // Wait for the backend to be ready
    waitForBackend(PYTHON_URL, 30000)
      .then(() => {
        console.log('[Electron] Python backend is ready');
        resolve();
      })
      .catch((error) => {
        console.error('[Electron] Python backend failed to start:', error);
        reject(error);
      });
  });
}

/**
 * Wait for the backend to be ready by polling the health endpoint
 */
function waitForBackend(url, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Backend startup timeout'));
        return;
      }

      http.get(`${url}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      }).on('error', () => {
        setTimeout(check, 500);
      });
    };

    check();
  });
}

/**
 * Create the main browser window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SyncHire',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../resources/icon.png'),
    show: false,
  });

  // Load the frontend
  mainWindow.loadURL(FRONTEND_URL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Stop the Python backend
 */
function stopPythonBackend() {
  if (pythonProcess) {
    console.log('[Electron] Stopping Python backend...');
    pythonProcess.kill('SIGTERM');

    // Force kill after 5 seconds if not stopped
    setTimeout(() => {
      if (pythonProcess) {
        pythonProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Start Python backend first
    await startPythonBackend();

    // Then create the window
    createWindow();
  } catch (error) {
    console.error('[Electron] Failed to start:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopPythonBackend();
});
