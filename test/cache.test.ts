import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadOrBuildGraph } from "../src/graph/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureSource = path.join(__dirname, "fixtures", "multi");

function makeSandbox(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-graph-cache-test-"));
  fs.cpSync(fixtureSource, dir, { recursive: true });
  return dir;
}

function cachePath(dir: string): string {
  return path.join(dir, ".graph-cache", "graph.json");
}

function withSandbox(fn: (dir: string) => void): void {
  const dir = makeSandbox();
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("builds the graph and writes a cache file on a cold run", () => {
  withSandbox((dir) => {
    assert.equal(fs.existsSync(cachePath(dir)), false);

    const graph = loadOrBuildGraph(dir);

    assert.ok(graph.get("validateOrder"));
    assert.equal(fs.existsSync(cachePath(dir)), true);

    const cacheContent = JSON.parse(fs.readFileSync(cachePath(dir), "utf8"));
    assert.ok(cacheContent.fileHashes[path.join(dir, "orders.ts")]);
    assert.ok(Array.isArray(cacheContent.graph));
  });
});

test("loads from the cache on a warm run instead of rebuilding", () => {
  withSandbox((dir) => {
    loadOrBuildGraph(dir);

    const raw = JSON.parse(fs.readFileSync(cachePath(dir), "utf8"));
    const entry = raw.graph.find(([key]: [string, unknown]) => key === "validateOrder");
    entry[1].sourceCode = "// tampered";
    fs.writeFileSync(cachePath(dir), JSON.stringify(raw));

    const graph = loadOrBuildGraph(dir);

    assert.equal(graph.get("validateOrder")?.sourceCode, "// tampered");
  });
});

test("rebuilds when a source file's content changes", () => {
  withSandbox((dir) => {
    loadOrBuildGraph(dir);

    const raw = JSON.parse(fs.readFileSync(cachePath(dir), "utf8"));
    const entry = raw.graph.find(([key]: [string, unknown]) => key === "validateOrder");
    entry[1].sourceCode = "// tampered";
    fs.writeFileSync(cachePath(dir), JSON.stringify(raw));

    fs.appendFileSync(path.join(dir, "orders.ts"), "\n// changed\n");

    const graph = loadOrBuildGraph(dir);

    assert.ok(graph.get("validateOrder")?.sourceCode.includes("function validateOrder"));
  });
});

test("rebuilds when a source file is added", () => {
  withSandbox((dir) => {
    loadOrBuildGraph(dir);

    fs.writeFileSync(path.join(dir, "extra.ts"), "export function extraFn() {\n  return 1;\n}\n");

    const graph = loadOrBuildGraph(dir);

    assert.ok(graph.get("extraFn"));
  });
});

test("rebuilds when a source file is removed", () => {
  withSandbox((dir) => {
    loadOrBuildGraph(dir);

    fs.rmSync(path.join(dir, "mathB.ts"));

    const graph = loadOrBuildGraph(dir);

    assert.equal(graph.has(`${path.join(dir, "mathB.ts")}:double`), false);
    assert.ok(graph.get("double"));
  });
});

test("rebuilds instead of crashing when the cache file is corrupt", () => {
  withSandbox((dir) => {
    loadOrBuildGraph(dir);
    fs.writeFileSync(cachePath(dir), "{ not valid json");

    const graph = loadOrBuildGraph(dir);

    assert.ok(graph.get("validateOrder"));
  });
});
