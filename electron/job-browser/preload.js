/**
 * Job Browser Preload
 *
 * Bridges the job browser assistant panel with the main process:
 * provides the fill engine bundle source (for <webview> injection),
 * the local API base URL, and the initial page URL.
 */

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const enginePath = path.join(__dirname, 'fill-engine.iife.js');

contextBridge.exposeInMainWorld('synchireJobBrowser', {
  getEngineSource: () => fs.readFileSync(enginePath, 'utf8'),
  getApiBase: () => ipcRenderer.invoke('job-browser:api-base'),
  getInitialUrl: () => ipcRenderer.invoke('job-browser:initial-url'),
});
