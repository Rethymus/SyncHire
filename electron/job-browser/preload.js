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
const { pathToFileURL } = require('url');

const enginePath = path.join(__dirname, 'fill-engine.iife.js');
const testFormPath = path.join(__dirname, 'test-form.html');

contextBridge.exposeInMainWorld('synchireJobBrowser', {
  getEngineSource: () => fs.readFileSync(enginePath, 'utf8'),
  getApiBase: () => ipcRenderer.invoke('job-browser:api-base'),
  getInitialUrl: () => ipcRenderer.invoke('job-browser:initial-url'),
  // Local static form for verifying the fill engine without a live ATS page
  getTestFormUrl: () => pathToFileURL(testFormPath).href,
});
