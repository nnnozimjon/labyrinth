#!/usr/bin/env node

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const distDir = join(root, "dist");
const port = Number(process.env.PORT) || 4173;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".glb": "model/gltf-binary",
};

function resolvePath(urlPath) {
  const safePath = urlPath.split("?")[0] || "/";
  const relative = safePath === "/" ? "/index.html" : safePath;
  return join(distDir, relative);
}

function sendBody(res, filePath, body, encoding) {
  const ext = extname(filePath);
  const headers = {
    "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "public, max-age=0",
  };

  if (encoding === "br") {
    headers["Content-Encoding"] = "br";
    headers["Vary"] = "Accept-Encoding";
  }

  res.writeHead(200, headers);
  res.end(body);
}

createServer((req, res) => {
  const filePath = resolvePath(req.url ?? "/");

  if (!filePath.startsWith(distDir)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const brotliPath = `${filePath}.br`;
  const hasFile = existsSync(filePath) && statSync(filePath).isFile();
  const hasBrotli = existsSync(brotliPath);

  if (!hasFile && !hasBrotli) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const acceptEncoding = req.headers["accept-encoding"] ?? "";

  if (acceptEncoding.includes("br") && hasBrotli) {
    sendBody(res, filePath, readFileSync(brotliPath), "br");
    return;
  }

  if (hasFile) {
    sendBody(res, filePath, readFileSync(filePath));
    return;
  }

  sendBody(res, filePath, readFileSync(brotliPath), "br");
}).listen(port, () => {
  console.log(`Brotli preview: http://localhost:${port}`);
});
