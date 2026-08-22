#!/usr/bin/env node
/**
 * Tear down the local FULL-STACK e2e environment started by
 * scripts/e2e-fullstack-up.mjs:
 *   - stop the uvicorn backend on :8010 (pid from tmp/e2e-fullstack-api.pid)
 *   - `docker compose down -v` for the isolated postgres/redis containers
 *
 * Idempotent: safe to run when nothing is up.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const tmpDir = path.join(root, 'tmp')
const COMPOSE_FILE = path.join(tmpDir, 'e2e-fullstack-compose.yml')
const PID_FILE = path.join(tmpDir, 'e2e-fullstack-api.pid')

let failed = false

// --- 1. Stop the backend process ----------------------------------------------
if (existsSync(PID_FILE)) {
  const pid = Number.parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10)
  if (Number.isFinite(pid)) {
    console.log(`[e2e-fullstack-down] stopping backend pid ${pid}...`)
    const kill = process.platform === 'win32'
      ? spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'])
      : spawnSync('kill', [String(pid)])
    if (kill.error || kill.status !== 0) {
      // Most likely already dead — report but do not fail cleanup.
      console.warn(`[e2e-fullstack-down] could not kill pid ${pid} (probably already stopped)`)
    }
  }
  rmSync(PID_FILE, { force: true })
} else {
  console.log('[e2e-fullstack-down] no pid file — backend not started by e2e-fullstack-up.mjs')
}

// --- 2. Remove the docker services ---------------------------------------------
if (existsSync(COMPOSE_FILE)) {
  console.log('[e2e-fullstack-down] docker compose down (synchire-e2e project)...')
  const down = spawnSync('docker', [
    '-f', COMPOSE_FILE, '-p', 'synchire-e2e', 'down', '-v', '--remove-orphans',
  ])
  if (down.error || down.status !== 0) {
    console.error(down.stdout || '')
    console.error(down.stderr || String(down.error))
    console.error('[e2e-fullstack-down] docker compose down failed — remove containers manually if needed')
    failed = true
  } else {
    console.log('[e2e-fullstack-down] postgres/redis containers and networks removed')
  }
  rmSync(COMPOSE_FILE, { force: true })
} else {
  console.log('[e2e-fullstack-down] no compose file — nothing to remove')
}

console.log(failed ? '[e2e-fullstack-down] finished with warnings' : '[e2e-fullstack-down] clean')
process.exitCode = failed ? 1 : 0
