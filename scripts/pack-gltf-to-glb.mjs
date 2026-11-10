#!/usr/bin/env node
/**
 * Packs `.gltf` models and their external `.bin` buffers into single `.glb` files.
 *
 * Download managers such as Internet Download Manager catch every request for a `.bin` file and
 * pop up a download dialog while the game loads. A `.glb` carries the same data in one binary
 * file they leave alone, and saves a request per model. Textures stay separate files, resolved
 * relative to the `.glb` exactly as they were relative to the `.gltf`.
 *
 * Usage:
 *   node scripts/pack-gltf-to-glb.mjs                       every public/*.gltf
 *   node scripts/pack-gltf-to-glb.mjs public/lamp.gltf      specific files
 *   ... --delete-sources                                    also remove each .gltf and its .bin
 */
import { readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");

const GLB_MAGIC = 0x46546c67; // "glTF"
const GLB_VERSION = 2;
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

const align4 = (n) => (n + 3) & ~3;

/** A GLB chunk: 8-byte header, then the body padded to a 4-byte boundary. */
function chunk(type, body, padByte) {
  const padded = Buffer.alloc(align4(body.length), padByte);
  body.copy(padded);
  const header = Buffer.alloc(8);
  header.writeUInt32LE(padded.length, 0);
  header.writeUInt32LE(type, 4);
  return Buffer.concat([header, padded]);
}

/** Writes `<name>.glb` next to the `.gltf`; returns its path and the buffer files it absorbed. */
function packGltf(gltfPath) {
  const dir = dirname(gltfPath);
  const gltf = JSON.parse(readFileSync(gltfPath, "utf8"));
  if (gltf.extensionsUsed?.includes("EXT_meshopt_compression")) {
    throw new Error(`${gltfPath}: EXT_meshopt_compression buffers are not supported`);
  }

  // Every buffer goes into the one GLB binary chunk. Starts stay 4-byte aligned so accessor
  // offsets remain valid, and each buffer view is re-pointed at the merged buffer.
  const parts = [];
  const starts = [];
  const absorbed = [];
  let length = 0;
  for (const buffer of gltf.buffers ?? []) {
    if (!buffer.uri) throw new Error(`${gltfPath}: buffer without a uri`);
    let data;
    if (buffer.uri.startsWith("data:")) {
      data = Buffer.from(buffer.uri.slice(buffer.uri.indexOf(",") + 1), "base64");
    } else {
      const file = join(dir, decodeURIComponent(buffer.uri));
      data = readFileSync(file);
      absorbed.push(file);
    }
    if (data.length < buffer.byteLength) {
      throw new Error(`${gltfPath}: ${buffer.uri} is shorter than its byteLength`);
    }
    const start = align4(length);
    parts.push(Buffer.alloc(start - length), data.subarray(0, buffer.byteLength));
    starts.push(start);
    length = start + buffer.byteLength;
  }
  for (const view of gltf.bufferViews ?? []) {
    const offset = (view.byteOffset ?? 0) + starts[view.buffer];
    if (offset) view.byteOffset = offset;
    view.buffer = 0;
  }
  // In a GLB, a buffer without a uri is the binary chunk.
  gltf.buffers = length > 0 ? [{ byteLength: length }] : undefined;

  const chunks = [chunk(CHUNK_JSON, Buffer.from(JSON.stringify(gltf), "utf8"), 0x20)];
  if (length > 0) chunks.push(chunk(CHUNK_BIN, Buffer.concat(parts), 0));
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(GLB_VERSION, 4);
  header.writeUInt32LE(12 + chunks.reduce((sum, c) => sum + c.length, 0), 8);

  const glbPath = join(dir, `${basename(gltfPath, extname(gltfPath))}.glb`);
  writeFileSync(glbPath, Buffer.concat([header, ...chunks]));
  return { glbPath, absorbed };
}

const args = process.argv.slice(2);
const deleteSources = args.includes("--delete-sources");
const named = args.filter((arg) => !arg.startsWith("--")).map((arg) => resolve(arg));
const targets =
  named.length > 0
    ? named
    : readdirSync(publicDir)
        .filter((file) => file.endsWith(".gltf"))
        .map((file) => join(publicDir, file));

if (targets.length === 0) console.log("No .gltf files to pack.");

const sources = new Set();
for (const gltfPath of targets) {
  const { glbPath, absorbed } = packGltf(gltfPath);
  const before = [gltfPath, ...absorbed].reduce((sum, file) => sum + statSync(file).size, 0);
  console.log(
    `${relative(root, gltfPath)} -> ${relative(root, glbPath)}  (${before} -> ${statSync(glbPath).size} bytes)`
  );
  for (const file of [gltfPath, ...absorbed]) sources.add(file);
}

// Deleted only after everything is packed, in case two models share a buffer file.
if (deleteSources) {
  for (const file of sources) unlinkSync(file);
  console.log(`Deleted ${sources.size} source files.`);
}
