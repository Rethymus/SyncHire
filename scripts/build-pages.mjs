#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1) || "SyncHire";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || `/${repositoryName}`;
const outputDirectory = join(process.cwd(), "frontend", "out");
const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'">`;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return htmlFiles(path);
      return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
    }),
  );
  return nested.flat();
}

async function injectStaticCsp() {
  for (const file of await htmlFiles(outputDirectory)) {
    const html = await readFile(file, "utf8");
    if (html.includes('http-equiv="Content-Security-Policy"')) continue;
    if (!html.includes("<head>")) throw new Error(`Cannot inject CSP: missing <head> in ${file}`);
    await writeFile(file, html.replace("<head>", `<head>${cspMeta}`));
  }
}

const result = spawnSync("npm", ["run", "build", "--workspace=frontend"], {
  env: {
    ...process.env,
    NEXT_OUTPUT: "export",
    NEXT_PUBLIC_DEPLOYMENT_TARGET: "github-pages",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.status !== 0) process.exit(result.status ?? 1);

await injectStaticCsp();
