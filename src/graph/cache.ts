// on-disk cache keyed by file hash / git commit
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildGraph, findSourceFiles, type GraphNode } from "./graph-builder.js";

const CACHE_RELATIVE_PATH = path.join(".graph-cache", "graph.json");

interface CacheFile {
  fileHashes: Record<string, string>;
  graph: Array<[string, GraphNode]>;
}

export function loadOrBuildGraph(rootDir: string): Map<string, GraphNode> {
  const cachePath = path.join(rootDir, CACHE_RELATIVE_PATH);
  const currentHashes = hashSourceFiles(rootDir);
  const cached = readCache(cachePath);

  if (cached && hashesMatch(cached.fileHashes, currentHashes)) {
    return new Map(cached.graph);
  }

  const graph = buildGraph(rootDir);
  writeCache(cachePath, { fileHashes: currentHashes, graph: [...graph] });
  return graph;
}

function hashSourceFiles(rootDir: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const filePath of findSourceFiles(rootDir)) {
    const content = fs.readFileSync(filePath);
    hashes[filePath] = crypto.createHash("sha256").update(content).digest("hex");
  }
  return hashes;
}

function hashesMatch(cached: Record<string, string>, current: Record<string, string>): boolean {
  const cachedKeys = Object.keys(cached);
  const currentKeys = Object.keys(current);
  if (cachedKeys.length !== currentKeys.length) {
    return false;
  }
  return currentKeys.every((filePath) => cached[filePath] === current[filePath]);
}

function readCache(cachePath: string): CacheFile | undefined {
  if (!fs.existsSync(cachePath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8")) as CacheFile;
  } catch {
    return undefined;
  }
}

function writeCache(cachePath: string, cache: CacheFile): void {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache));
}
