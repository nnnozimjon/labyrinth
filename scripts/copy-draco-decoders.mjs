#!/usr/bin/env node

import { copyFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(
  root,
  "node_modules/three/examples/jsm/libs/draco/gltf"
);
const targetDir = join(root, "public/draco");

mkdirSync(targetDir, { recursive: true });

for (const file of ["draco_decoder.wasm", "draco_wasm_wrapper.js"]) {
  copyFileSync(join(sourceDir, file), join(targetDir, file));
}

const legacyJsDecoder = join(targetDir, "draco_decoder.js");
if (existsSync(legacyJsDecoder)) {
  unlinkSync(legacyJsDecoder);
}

console.log("Draco WASM decoder copied to public/draco/ (JS fallback removed)");
