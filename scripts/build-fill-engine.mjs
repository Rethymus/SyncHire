/**
 * Bundles the form fill engine (and its browser-fill-assistant
 * dependency) into a standalone IIFE consumed by:
 *   - the Electron job browser side panel (script tag), and
 *   - injection into <webview> pages via executeJavaScript.
 *
 * Run: npm run build:fill-engine
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(rootDir, 'frontend/src/lib/form-fill-engine.ts');
const outfile = path.join(rootDir, 'electron/job-browser/fill-engine.iife.js');

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  globalName: 'SynchireFillEngine',
  target: 'chrome120',
  platform: 'browser',
  legalComments: 'none',
  minify: true,
  outfile,
});

console.log(`[build-fill-engine] wrote ${path.relative(rootDir, outfile)}`);
