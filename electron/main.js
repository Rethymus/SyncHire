/**
 * Electron Main Process
 *
 * Manages the application lifecycle, spawns the Python backend,
 * and creates the main browser window.
 */

const { app, BrowserWindow, shell, ipcMain } = require('electron');
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
let jobBrowserWindow = null;
let jobBrowserInitialUrl = null;

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
 * Create the Job Browser window: an embedded browser with the fill
 * assistant panel. The <webview> uses a persistent partition so ATS
 * login cookies survive across sessions.
 */
function createJobBrowserWindow(initialUrl) {
  if (jobBrowserWindow) {
    jobBrowserWindow.focus();
    return jobBrowserWindow;
  }

  jobBrowserInitialUrl = initialUrl || null;

  jobBrowserWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'SyncHire 求职浏览器',
    webPreferences: {
      preload: path.join(__dirname, 'job-browser/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // The assistant panel is local trusted content hosting a webview
      webviewTag: true,
      sandbox: false, // preload needs fs to read the engine bundle
    },
    show: false,
  });

  jobBrowserWindow.loadFile(path.join(__dirname, 'job-browser/index.html'));

  jobBrowserWindow.once('ready-to-show', () => {
    jobBrowserWindow.show();
  });

  jobBrowserWindow.on('closed', () => {
    jobBrowserWindow = null;
    jobBrowserInitialUrl = null;
  });

  return jobBrowserWindow;
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

/**
 * Script executed inside the <webview> guest page once the test form
 * has loaded: raw form metrics plus the engine's own detection result.
 */
const SMOKE_GUEST_CHECK_SCRIPT = `(() => {
  const els = document.querySelectorAll('input, select, textarea');
  const submit = document.querySelector('input[type="submit"], button[type="submit"]');
  const detected = SynchireFillEngine.detectFormFields(document);
  return {
    url: location.href,
    rawFieldCount: els.length,
    hasSubmit: !!submit,
    engineDetected: detected.length,
    detectedSubmit: detected.some((f) => f.name === 'submit'),
  };
})()`;

/**
 * SMOKE mode (SYNCHIRE_SMOKE=1; see electron/smoke-test.js for the
 * launcher). Boots the job browser window, self-checks the assistant
 * panel, then exercises the "打开测试表单" entry end-to-end (button click
 * -> preload file:// URL -> webview navigation -> engine injection ->
 * field detection) and exits non-zero on any failure. Runs fully
 * offline: an external page is only loaded when SYNCHIRE_SMOKE_URL is
 * explicitly provided.
 */
function runJobBrowserSmoke() {
  const externalUrl = process.env.SYNCHIRE_SMOKE_URL || null;
  const jobWindow = createJobBrowserWindow(externalUrl);
  const fail = (reason) => {
    console.error(`[SMOKE] FAIL: ${reason}`);
    app.exit(1);
  };

  // Hard watchdog so a hung check can never wedge the runner
  const watchdog = setTimeout(() => {
    console.error('[SMOKE] FAIL: watchdog timeout (45s)');
    app.exit(2);
  }, 45000);

  const waitFor = async (predicate, label, timeoutMs = 10000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      let ok = false;
      try {
        ok = await predicate();
      } catch {
        ok = false; // page may not be ready for executeJavaScript yet
      }
      if (ok) return ok;
      if (Date.now() > deadline) throw new Error(`timeout waiting for ${label}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  (async () => {
    // 1) Panel booted: action bar, test-form button, webview, engine bundle
    const checks = await waitFor(
      () => jobWindow.webContents.executeJavaScript(`(() => ({
        hasPanel: !!document.getElementById('panel-actions'),
        hasWebview: !!document.getElementById('webview'),
        hasTestFormBtn: !!document.getElementById('test-form-btn'),
        hasEngine: typeof window.SynchireFillEngine === 'object'
          && typeof window.SynchireFillEngine.detectFormFields === 'function',
      }))()`),
      'assistant panel to load',
    );
    console.log('[SMOKE] panel checks:', JSON.stringify(checks));
    if (!checks.hasPanel) return fail('assistant panel missing');
    if (!checks.hasWebview) return fail('webview element missing');
    if (!checks.hasTestFormBtn) return fail('test form button missing');
    if (!checks.hasEngine) return fail('fill engine bundle not loaded');

    // 2) Optional external page first (opt-in, keeps old behavior alive)
    if (externalUrl) {
      await waitFor(
        () => jobWindow.webContents.executeJavaScript(
          `document.getElementById('webview').getURL().startsWith(${JSON.stringify(externalUrl)})`,
        ),
        `webview to load ${externalUrl}`,
        20000,
      );
    }

    // 3) The real user path: click 打开测试表单, wait for dom-ready inside
    //    the webview, then wait for the engine to be (re)injected.
    const form = await jobWindow.webContents.executeJavaScript(`(async () => {
      const webview = document.getElementById('webview');
      let domReady = false;
      const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('test form dom-ready timeout')), 20000);
        webview.addEventListener('dom-ready', () => {
          domReady = true; clearTimeout(timer); resolve();
        });
      });
      // Panel init is async; keep clicking until navigation starts.
      const startedAt = Date.now();
      while (!domReady) {
        if (Date.now() - startedAt > 15000) {
          throw new Error('test form button did not trigger navigation');
        }
        const src = webview.getAttribute('src') || '';
        if (!/test-form\\.html$/.test(src)) {
          document.getElementById('test-form-btn').click();
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await ready;

      // dom-ready re-injects the engine via panel.js; poll for it
      const deadline = Date.now() + 10000;
      for (;;) {
        const injected = await webview.executeJavaScript(
          'typeof SynchireFillEngine === "object"', true);
        if (injected) break;
        if (Date.now() > deadline) {
          throw new Error('fill engine not injected into the test form');
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      return webview.executeJavaScript(${JSON.stringify(SMOKE_GUEST_CHECK_SCRIPT)}, true);
    })()`);

    // 4) Assertions
    console.log('[SMOKE] test form:', JSON.stringify(form));
    if (!/^file:\/\//i.test(form.url) || !/test-form\.html$/i.test(form.url)) {
      return fail(`webview did not load the local test form: ${form.url}`);
    }
    if (form.rawFieldCount < 14) {
      return fail(`expected >=14 raw form fields, got ${form.rawFieldCount}`);
    }
    if (!form.hasSubmit) return fail('submit button missing in test form');
    if (form.engineDetected < 14) {
      return fail(`fill engine detected <14 fields (${form.engineDetected})`);
    }
    if (form.detectedSubmit) {
      return fail('engine must never detect the submit control');
    }
    console.log(
      `[SMOKE] OK — test form loaded via button: ${form.rawFieldCount} raw fields, ` +
      `submit present, engine detected ${form.engineDetected} (submit excluded)`,
    );
    clearTimeout(watchdog);
    app.exit(0);
  })().catch((err) => fail(err && err.message ? err.message : String(err)));
}

// App lifecycle
app.whenReady().then(async () => {
  // Job browser IPC (safe: URL must be http/https, window is local file)
  ipcMain.handle('job-browser:open', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      createJobBrowserWindow(url);
      return true;
    }
    createJobBrowserWindow(null);
    return true;
  });
  ipcMain.handle('job-browser:api-base', () => PYTHON_URL);
  ipcMain.handle('job-browser:initial-url', () => jobBrowserInitialUrl);

  // SMOKE mode: self-check the job browser + test form flow, then exit
  // with a non-zero code on any failure (used by automated checks).
  if (process.env.SYNCHIRE_SMOKE === '1') {
    runJobBrowserSmoke();
    return;
  }

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
