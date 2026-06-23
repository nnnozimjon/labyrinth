#!/usr/bin/env node

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function collectWebpFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectWebpFiles(fullPath));
      continue;
    }
    if (extname(entry.name).toLowerCase() === ".webp") {
      files.push(fullPath);
    }
  }
  return files;
}

/** Aggressive settings tuned for ~0.5 MB total across all textures. */
function getSettings(relativePath) {
  const name = relativePath.toLowerCase();

  if (name.includes("magazine")) return { maxWidth: 640, quality: 48 };
  if (name.includes("ground-2") || name.includes("fabric-2")) return { maxWidth: 896, quality: 45 };
  if (name.endsWith("/fabric.webp")) return { maxWidth: 896, quality: 46 };
  if (name.includes("stairs-1")) return { maxWidth: 640, quality: 48 };
  if (name.includes("book-cover") || name.includes("box-cover")) return { maxWidth: 448, quality: 50 };
  if (name.includes("tickets")) return { maxWidth: 448, quality: 52 };
  if (name.includes("level-")) return { maxWidth: 384, quality: 48 };
  if (name.includes("dice")) return { maxWidth: 384, quality: 52 };
  if (name.includes("image_") || name.includes("formula55")) return { maxWidth: 448, quality: 50 };
  return { maxWidth: 448, quality: 50 };
}

const files = collectWebpFiles(publicDir).sort();
let totalBefore = 0;
let totalAfter = 0;

for (const filePath of files) {
  const rel = relative(root, filePath);
  const before = statSync(filePath).size;
  const { maxWidth, quality } = getSettings(rel);
  const input = sharp(filePath);
  const metadata = await input.metadata();
  const width = metadata.width ?? maxWidth;
  const pipeline =
    width > maxWidth ? input.resize({ width: maxWidth, withoutEnlargement: true }) : input;
  const output = await pipeline.webp({ quality, effort: 4 }).toBuffer();

  writeFileSync(filePath, output);
  totalBefore += before;
  totalAfter += output.length;
  console.log(
    `${rel}: ${formatBytes(before)} → ${formatBytes(output.length)} (-${((1 - output.length / before) * 100).toFixed(1)}%)`
  );
}

console.log(`\nTotal: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)}`);
