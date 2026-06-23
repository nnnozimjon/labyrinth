#!/usr/bin/env node

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const quality = 80;

/** Paths relative to project root. maxWidth keeps UI textures sharp on mobile. */
const targets = [
  { path: "public/magazine-left.webp", maxWidth: 960, quality: 72 },
  { path: "public/magazine-right.webp", maxWidth: 960, quality: 72 },
  { path: "public/stairs-1.webp", maxWidth: 1024 },
  { path: "public/textures/ground-2.webp", maxWidth: 2048 },
  { path: "public/textures/fabric-2.webp", maxWidth: 2048 },
  { path: "public/textures/fabric.webp", maxWidth: 2048 },
  { path: "public/textures/book-cover.webp", maxWidth: 1024 },
  { path: "public/textures/box-cover.webp", maxWidth: 1024 },
  { path: "public/textures/level-1.webp", maxWidth: 1024 },
  { path: "public/textures/level-2.webp", maxWidth: 1024 },
  { path: "public/textures/level-3.webp", maxWidth: 1024 },
  { path: "public/textures/level-4.webp", maxWidth: 1024 },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

let totalBefore = 0;
let totalAfter = 0;

for (const target of targets) {
  const filePath = join(root, target.path);
  const before = statSync(filePath).size;
  const input = sharp(filePath);
  const metadata = await input.metadata();
  const width = metadata.width ?? target.maxWidth;
  const q = target.quality ?? quality;
  const pipeline =
    width > target.maxWidth
      ? input.resize({ width: target.maxWidth, withoutEnlargement: true })
      : input;

  const output = await pipeline.webp({ quality: q, effort: 6 }).toBuffer();
  writeFileSync(filePath, output);

  totalBefore += before;
  totalAfter += output.length;
  const saved = ((1 - output.length / before) * 100).toFixed(1);
  console.log(
    `${target.path}: ${formatBytes(before)} → ${formatBytes(output.length)} (-${saved}%)`
  );
}

console.log(
  `\nTotal: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (-${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`
);
