#!/usr/bin/env node
// e2e-preflight.mjs — port guard for Playwright e2e runs.
//
// Why: when a Playwright run is killed (timeout, Ctrl-C, agent cleanup), its
// webServer `next dev` can be orphaned on the e2e port in a "listening but
// never responding" state. Playwright's webServer readiness probe then waits
// forever against the zombie and the whole suite appears to hang (~minutes of
// silence instead of the normal ~40s startup). This script fails fast, before
// `playwright test` even starts, with actionable cleanup guidance.
//
// Decision table per port (defaults: 3000 and 8000):
//   - nothing listening                  -> exit 0 (clean; Playwright will boot its own dev server)
//   - listening + HTTP /dashboard answers-> exit 0 (reusing an existing, healthy server)
//   - listening but no HTTP answer (10s) -> print diagnostics (netstat PIDs + taskkill commands)
//                                           and exit 1 (zombie signature)
//
// Manual usage:
//   node scripts/e2e-preflight.mjs                 # check default ports 3000,8000
//   node scripts/e2e-preflight.mjs 3999            # check explicit port(s)
//   E2E_PREFLIGHT_PORTS=3999,4000 node scripts/e2e-preflight.mjs
//   E2E_PREFLIGHT_PATH=/ node scripts/e2e-preflight.mjs   # override probe path (default /dashboard)
// PLAYWRIGHT_PORT is honored when set (matches playwright.config.ts).
//
// Wired into package.json as `npm run test:e2e:guarded`.

import net from "node:net";
import { execSync } from "node:child_process";
import process from "node:process";

const HTTP_TIMEOUT_MS = 10_000;
const TCP_TIMEOUT_MS = 1_500;
const DEFAULT_PORTS = [3000, 8000];

function parsePorts() {
  const fromEnv = process.env.E2E_PREFLIGHT_PORTS;
  const fromArgs = process.argv.slice(2).join(",");
  const raw = fromArgs || fromEnv || (process.env.PLAYWRIGHT_PORT ? String(process.env.PLAYWRIGHT_PORT) : DEFAULT_PORTS.join(","));
  const ports = raw
    .split(/[,\s]+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0 && value < 65536);
  return [...new Set(ports)];
}

function probeTcp(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

// Returns the host that actually accepted a TCP connection, or null.
async function findListeningHost(port) {
  for (const host of ["127.0.0.1", "::1"]) {
    if (await probeTcp(port, host)) {
      return host;
    }
  }
  return null;
}

async function probeHttp(port, host, path) {
  const url = `http://${host === "::1" ? "[::1]" : host}:${port}${path}`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "synchire-e2e-preflight/1.0" },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    // Drain the body so the socket is released cleanly.
    await response.arrayBuffer().catch(() => undefined);
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error };
  }
}

function findPidsListeningOn(port) {
  const pids = new Set();
  try {
    const isWindows = process.platform === "win32";
    const output = isWindows
      ? execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: "utf8", shell: true })
      : execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null || ss -ltnp 2>/dev/null | grep :${port}`, {
          encoding: "utf8",
          shell: "/bin/bash",
        });
    for (const line of output.split(/\r?\n/)) {
      if (!/(LISTENING|LISTEN)/i.test(line)) {
        continue;
      }
      const match = line.trim().match(/(\d+)\s*$/);
      if (match) {
        pids.add(match[1]);
      }
    }
  } catch {
    // netstat/lsof unavailable or no match — guidance below still helps.
  }
  return [...pids];
}

function printZombieHelp(port, detail) {
  const isWindows = process.platform === "win32";
  console.error("");
  console.error(`[e2e-preflight] Port ${port} is LISTENING but does not answer HTTP (${detail}).`);
  console.error("[e2e-preflight] This is the classic orphaned/zombie dev-server signature:");
  console.error("[e2e-preflight] a killed Playwright run left `next dev` holding the port without serving.");
  console.error("[e2e-preflight] Playwright's webServer readiness probe would hang against it, stalling the suite.");
  const pids = findPidsListeningOn(port);
  if (pids.length > 0) {
    console.error(`[e2e-preflight] Owner PID(s) on :${port}: ${pids.join(", ")}`);
    for (const pid of pids) {
      console.error(
        isWindows
          ? `  taskkill /PID ${pid} /F`
          : `  kill -9 ${pid}`
      );
    }
    if (isWindows) {
      console.error(`  (verify first with: netstat -ano | findstr :${port})`);
    }
  } else {
    console.error(`[e2e-preflight] Could not resolve the owner PID automatically. Find it manually:`);
    console.error(
      isWindows
        ? `  netstat -ano | findstr :${port}   then: taskkill /PID <pid> /F`
        : `  lsof -nP -iTCP:${port} -sTCP:LISTEN   then: kill -9 <pid>`
    );
  }
  console.error("[e2e-preflight] After cleanup, re-run the guarded command: npm run test:e2e:guarded");
}

async function main() {
  const ports = parsePorts();
  const probePath = process.env.E2E_PREFLIGHT_PATH || "/dashboard";
  if (!probePath.startsWith("/")) {
    console.error("[e2e-preflight] E2E_PREFLIGHT_PATH must start with '/'.");
    process.exit(2);
  }

  let failed = false;

  for (const port of ports) {
    const host = await findListeningHost(port);
    if (!host) {
      console.log(`[e2e-preflight] :${port} free — no listener, Playwright will start its own webServer.`);
      continue;
    }

    const result = await probeHttp(port, host, probePath);
    if (result.ok) {
      if (result.status >= 500) {
        console.warn(
          `[e2e-preflight] :${port} answered HTTP ${result.status} on ${probePath} (server error but responding) — treating as alive; Playwright will re-check readiness.`
        );
      } else {
        console.log(
          `[e2e-preflight] :${port} already serving (HTTP ${result.status} on ${probePath}) — reusing the existing server.`
        );
      }
      continue;
    }

    failed = true;
    const reason =
      result.error?.name === "TimeoutError"
        ? `no HTTP response within ${HTTP_TIMEOUT_MS / 1000}s`
        : result.error?.cause?.code || result.error?.cause?.message || result.error?.message || "request failed";
    printZombieHelp(port, reason);
  }

  process.exit(failed ? 1 : 0);
}

main();
