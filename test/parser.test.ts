import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractSymbols } from "../src/graph/parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "fixtures", "sample.ts");

function byName(symbols: ReturnType<typeof extractSymbols>, name: string) {
  const symbol = symbols.find((s) => s.name === name);
  assert.ok(symbol, `expected a symbol named ${name}`);
  return symbol;
}

test("extracts every top level function and class method", () => {
  const symbols = extractSymbols(fixturePath);
  const names = symbols.map((s) => s.name).sort();

  assert.deepEqual(names, [
    "isPositiveAmount",
    "isValidEmail",
    "logTotal",
    "process",
    "recordTotal",
    "validateOrder",
  ]);
});

test("captures called symbol names from a function that calls two others", () => {
  const symbols = extractSymbols(fixturePath);
  const validateOrder = byName(symbols, "validateOrder");

  assert.deepEqual(validateOrder.calledSymbolNames, ["isPositiveAmount", "isValidEmail"]);
});

test("resolves this.method() calls to the method name", () => {
  const symbols = extractSymbols(fixturePath);
  const process = byName(symbols, "process");

  assert.deepEqual(process.calledSymbolNames, ["validateOrder", "recordTotal"]);
});

test("follows calls through a chain: process -> recordTotal -> logTotal", () => {
  const symbols = extractSymbols(fixturePath);
  const recordTotal = byName(symbols, "recordTotal");

  assert.deepEqual(recordTotal.calledSymbolNames, ["logTotal"]);
});

test("leaf functions with no calls report an empty list", () => {
  const symbols = extractSymbols(fixturePath);
  const isPositiveAmount = byName(symbols, "isPositiveAmount");

  assert.deepEqual(isPositiveAmount.calledSymbolNames, []);
});

test("reports accurate start and end lines for a symbol", () => {
  const symbols = extractSymbols(fixturePath);
  const isPositiveAmount = byName(symbols, "isPositiveAmount");

  assert.equal(isPositiveAmount.startLine, 14);
  assert.equal(isPositiveAmount.endLine, 16);
  assert.ok(isPositiveAmount.sourceCode.startsWith("function isPositiveAmount"));
});
