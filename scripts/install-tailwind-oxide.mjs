#!/usr/bin/env node

const version = "4.3.0";

const packages = {
  "win32-x64": "@tailwindcss/oxide-win32-x64-msvc",
  "win32-arm64": "@tailwindcss/oxide-win32-arm64-msvc",
  "linux-x64": "@tailwindcss/oxide-linux-x64-gnu",
  "linux-arm64": "@tailwindcss/oxide-linux-arm64-gnu",
  "darwin-x64": "@tailwindcss/oxide-darwin-x64",
  "darwin-arm64": "@tailwindcss/oxide-darwin-arm64",
};

const key = `${process.platform}-${process.arch}`;
const packageName = packages[key];

if (!packageName) {
  console.log(`No Tailwind oxide native package mapping for ${key}; skipping.`);
  process.exit(0);
}

const { spawnSync } = await import("node:child_process");

console.log(`Installing ${packageName}@${version} for ${key}`);

const result = spawnSync(
  "npm",
  [
    "install",
    "--no-save",
    "--include=optional",
    "--no-audit",
    "--no-fund",
    `${packageName}@${version}`,
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
