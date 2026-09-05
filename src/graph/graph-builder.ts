// builds call graph from parsed files
import fs from "node:fs";
import path from "node:path";
import { extractSymbols, type ExtractedSymbol } from "./parser.js";

export interface GraphNode {
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  sourceCode: string;
  callers: string[];
  callees: string[];
}

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", ".git"]);

export function buildGraph(rootDir: string): Map<string, GraphNode> {
  const extracted: Array<{ filePath: string; symbol: ExtractedSymbol }> = [];
  for (const filePath of findSourceFiles(rootDir)) {
    for (const symbol of extractSymbols(filePath)) {
      extracted.push({ filePath, symbol });
    }
  }

  const nameCounts = new Map<string, number>();
  for (const { symbol } of extracted) {
    nameCounts.set(symbol.name, (nameCounts.get(symbol.name) ?? 0) + 1);
  }

  const keyFor = (filePath: string, name: string): string =>
    (nameCounts.get(name) ?? 0) > 1 ? `${filePath}:${name}` : name;

  const graph = new Map<string, GraphNode>();
  const keysByName = new Map<string, string[]>();

  for (const { filePath, symbol } of extracted) {
    const key = keyFor(filePath, symbol.name);
    graph.set(key, {
      name: symbol.name,
      filePath,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
      sourceCode: symbol.sourceCode,
      callers: [],
      callees: [],
    });
    const keys = keysByName.get(symbol.name);
    if (keys) {
      keys.push(key);
    } else {
      keysByName.set(symbol.name, [key]);
    }
  }

  for (const { filePath, symbol } of extracted) {
    const callerKey = keyFor(filePath, symbol.name);
    const callerNode = graph.get(callerKey);
    if (!callerNode) {
      continue;
    }
    for (const calledName of symbol.calledSymbolNames) {
      const calleeKey = resolveCallee(calledName, filePath, keysByName);
      if (!calleeKey) {
        continue;
      }
      const calleeNode = graph.get(calleeKey);
      if (!calleeNode) {
        continue;
      }
      callerNode.callees.push(calleeKey);
      calleeNode.callers.push(callerKey);
    }
  }

  return graph;
}

function resolveCallee(
  calledName: string,
  callerFilePath: string,
  keysByName: Map<string, string[]>,
): string | undefined {
  const candidates = keysByName.get(calledName);
  if (!candidates || candidates.length === 0) {
    return undefined;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  // The name collides across files. Without import tracking there is no way
  // to know which one was meant, so only resolve the case where the caller's
  // own file defines a symbol with that name; otherwise drop the call.
  return candidates.find((key) => key === `${callerFilePath}:${calledName}`);
}

export function findSourceFiles(rootDir: string): string[] {
  const results: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }
      if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(path.join(dir, entry.name));
      }
    }
  };

  walk(rootDir);
  return results;
}
