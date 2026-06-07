import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const replacements = [
  {
    file: "android/app/build.gradle",
    pattern: /\nrepositories\s*\{\s*flatDir\s*\{\s*dirs\s+'\.\.\/capacitor-cordova-android-plugins\/src\/main\/libs',\s*'libs'\s*\}\s*\}\s*\n/g,
    replacement: "\n",
  },
  {
    file: "android/capacitor-cordova-android-plugins/build.gradle",
    pattern: /repositories\s*\{\s*google\(\)\s*mavenCentral\(\)\s*flatDir\s*\{\s*dirs\s+'src\/main\/libs',\s*'libs'\s*\}\s*\}/g,
    replacement: "repositories {\n    google()\n    mavenCentral()\n}",
  },
];

let changed = false;

for (const { file, pattern, replacement } of replacements) {
  const filePath = resolve(root, file);
  if (!existsSync(filePath)) {
    continue;
  }

  const before = readFileSync(filePath, "utf8");
  const after = before.replace(pattern, replacement);

  if (after !== before) {
    writeFileSync(filePath, after);
    changed = true;
  }
}

if (changed) {
  console.log("Removed generated Capacitor flatDir repositories.");
}
