import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGraph, type GraphNode } from "../src/graph/graph-builder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "multi");

const ordersPath = path.join(fixtureDir, "orders.ts");
const validatorsPath = path.join(fixtureDir, "validators.ts");
const loggerPath = path.join(fixtureDir, "logger.ts");
const mathAPath = path.join(fixtureDir, "mathA.ts");
const mathBPath = path.join(fixtureDir, "mathB.ts");

function get(graph: Map<string, GraphNode>, key: string): GraphNode {
  const node = graph.get(key);
  assert.ok(node, `expected a graph node keyed "${key}"`);
  return node;
}

test("skips node_modules, dist, and .git while walking", () => {
  const graph = buildGraph(fixtureDir);
  const names = [...graph.values()].map((n) => n.name);

  assert.ok(names.length > 0);
  for (const node of graph.values()) {
    assert.ok(!node.filePath.includes(`${path.sep}node_modules${path.sep}`));
    assert.ok(!node.filePath.includes(`${path.sep}dist${path.sep}`));
    assert.ok(!node.filePath.includes(`${path.sep}.git${path.sep}`));
  }
});

test("resolves a cross-file call: validateOrder -> validators.ts", () => {
  const graph = buildGraph(fixtureDir);
  const validateOrder = get(graph, "validateOrder");

  assert.equal(validateOrder.filePath, ordersPath);
  assert.deepEqual(validateOrder.callees.sort(), ["isPositiveAmount", "isValidEmail"]);

  const isPositiveAmount = get(graph, "isPositiveAmount");
  assert.equal(isPositiveAmount.filePath, validatorsPath);
  assert.deepEqual(isPositiveAmount.callers, ["validateOrder"]);
});

test("resolves a call chain across three files: process -> recordTotal -> logTotal", () => {
  const graph = buildGraph(fixtureDir);

  const process = get(graph, "process");
  assert.deepEqual(process.callees, ["validateOrder", "recordTotal"]);

  const recordTotal = get(graph, "recordTotal");
  assert.deepEqual(recordTotal.callees, ["logTotal"]);

  const logTotal = get(graph, "logTotal");
  assert.equal(logTotal.filePath, loggerPath);
  assert.deepEqual(logTotal.callers, ["recordTotal"]);
});

test("drops calls to symbols with no match in the graph, like console.log", () => {
  const graph = buildGraph(fixtureDir);
  const logTotal = get(graph, "logTotal");

  assert.deepEqual(logTotal.callees, []);
});

test("keys colliding names by filePath:name instead of overwriting one another", () => {
  const graph = buildGraph(fixtureDir);

  assert.equal(graph.has("double"), false);
  assert.ok(graph.has(`${mathAPath}:double`));
  assert.ok(graph.has(`${mathBPath}:double`));

  const doubleA = get(graph, `${mathAPath}:double`);
  const doubleB = get(graph, `${mathBPath}:double`);
  assert.equal(doubleA.filePath, mathAPath);
  assert.equal(doubleB.filePath, mathBPath);
  assert.notEqual(doubleA.sourceCode, doubleB.sourceCode);
});

test("resolves calls to a colliding name using the caller's own file", () => {
  const graph = buildGraph(fixtureDir);

  const quadruple = get(graph, "quadruple");
  assert.deepEqual(quadruple.callees, [`${mathAPath}:double`]);

  const scaleByFour = get(graph, "scaleByFour");
  assert.deepEqual(scaleByFour.callees, [`${mathBPath}:double`]);

  const doubleA = get(graph, `${mathAPath}:double`);
  assert.deepEqual(doubleA.callers, ["quadruple"]);

  const doubleB = get(graph, `${mathBPath}:double`);
  assert.deepEqual(doubleB.callers, ["scaleByFour"]);
});
