#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["run", "build", "--workspace=frontend"], {
  env: {
    ...process.env,
    NEXT_OUTPUT: "export",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
