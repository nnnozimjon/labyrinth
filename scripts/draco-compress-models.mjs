#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsDir = join(root, "src");
const GLB_MAGIC = "glTF";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function isBinaryGlb(filePath) {
  const header = readFileSync(filePath, { encoding: "ascii", flag: "r" }).slice(0, 4);
  return header === GLB_MAGIC;
}

const files = readdirSync(modelsDir).filter((file) => file.endsWith(".glb"));
let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const inputPath = join(modelsDir, file);
  // Must end with `.glb` or gltf-transform writes JSON + external `.bin` files.
  const tempPath = join(modelsDir, `${file}.draco.tmp.glb`);
  const before = statSync(inputPath).size;

  const result = spawnSync(
    "gltf-transform",
    ["draco", inputPath, tempPath],
    { stdio: "pipe", encoding: "utf8" }
  );

  if (result.status !== 0) {
    console.error(`FAIL ${file}: ${result.stderr || result.stdout}`);
    continue;
  }

  if (!isBinaryGlb(tempPath)) {
    unlinkSync(tempPath);
    console.error(`FAIL ${file}: output is not a binary .glb`);
    continue;
  }

  const after = statSync(tempPath).size;

  if (after >= before) {
    unlinkSync(tempPath);
    console.log(`SKIP ${file}: ${formatBytes(before)} (no size gain)`);
    continue;
  }

  unlinkSync(inputPath);
  renameSync(tempPath, inputPath);

  totalBefore += before;
  totalAfter += after;
  const saved = ((1 - after / before) * 100).toFixed(1);
  console.log(
    `${file}: ${formatBytes(before)} → ${formatBytes(after)} (-${saved}%)`
  );
}

console.log(
  `\nTotal: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (-${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`
);
