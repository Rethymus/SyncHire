/**
 * Smoke test launcher for the Electron job browser (auto-exits).
 *
 * Boots electron/main.js with SYNCHIRE_SMOKE=1: opens the job browser
 * window, self-checks the assistant panel, then clicks "打开测试表单"
 * and asserts the bundled test form loads in the <webview> with the
 * fill engine detecting its fields (submit control excluded).
 *
 * Exit codes: 0 = pass, 1 = assertion/setup failure, 2 = watchdog.
 * Runs fully offline (no external URL unless SYNCHIRE_SMOKE_URL is set).
 *
 * Prerequisite (generates the engine bundle):
 *   npm run build:fill-engine
 *
 * Run from the repo root:
 *   npx electron electron/smoke-test.js          (Git Bash / macOS / Linux)
 *   npx electron electron\smoke-test.js          (Windows cmd)
 */

'use strict';

process.env.SYNCHIRE_SMOKE = process.env.SYNCHIRE_SMOKE || '1';
require('./main.js');
