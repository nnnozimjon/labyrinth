#!/usr/bin/env node

import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const texturesDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../public/textures"
);
const sourceExtensions = new Set([".png", ".jpg", ".jpeg"]);
const quality = 85;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

async function convertFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (!sourceExtensions.has(ext)) return null;

  const name = basename(filePath, ext);
  const outputPath = join(texturesDir, `${name}.webp`);
  const inputSize = statSync(filePath).size;

  await sharp(filePath).webp({ quality }).toFile(outputPath);

  const outputSize = statSync(outputPath).size;
  unlinkSync(filePath);

  return { name, inputSize, outputSize };
}

const files = readdirSync(texturesDir)
  .map((file) => join(texturesDir, file))
  .filter((filePath) => sourceExtensions.has(extname(filePath).toLowerCase()));

let totalIn = 0;
let totalOut = 0;

for (const filePath of files) {
  const result = await convertFile(filePath);
  if (!result) continue;

  totalIn += result.inputSize;
  totalOut += result.outputSize;
  const ratio = ((1 - result.outputSize / result.inputSize) * 100).toFixed(1);
  console.log(
    `${result.name}: ${formatBytes(result.inputSize)} → ${formatBytes(result.outputSize)} (-${ratio}%)`
  );
}

console.log(
  `\nTotal: ${formatBytes(totalIn)} → ${formatBytes(totalOut)} (-${((1 - totalOut / totalIn) * 100).toFixed(1)}%)`
);
