// the MCP tool handler
import path from "node:path";
import type { GraphNode } from "../graph/graph-builder.js";

export interface GetSymbolContextArgs {
  filePath: string;
  symbolName: string;
}

export interface GetSymbolContextResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function getSymbolContext(
  graph: Map<string, GraphNode>,
  rootDir: string,
  args: GetSymbolContextArgs,
): GetSymbolContextResult {
  const targetPath = path.isAbsolute(args.filePath) ? args.filePath : path.resolve(rootDir, args.filePath);

  const target = findNode(graph, targetPath, args.symbolName);
  if (!target) {
    return {
      isError: true,
      content: [
        { type: "text", text: `No symbol named "${args.symbolName}" found in ${args.filePath}.` },
      ],
    };
  }

  const callers = resolveNodes(graph, target.callers);
  const callees = resolveNodes(graph, target.callees);

  return {
    content: [{ type: "text", text: formatContext(target, callers, callees) }],
  };
}

function findNode(graph: Map<string, GraphNode>, filePath: string, symbolName: string): GraphNode | undefined {
  for (const node of graph.values()) {
    if (node.name === symbolName && path.resolve(node.filePath) === filePath) {
      return node;
    }
  }
  return undefined;
}

function resolveNodes(graph: Map<string, GraphNode>, keys: string[]): GraphNode[] {
  const nodes: GraphNode[] = [];
  for (const key of keys) {
    const node = graph.get(key);
    if (node) {
      nodes.push(node);
    }
  }
  return nodes;
}

function formatContext(target: GraphNode, callers: GraphNode[], callees: GraphNode[]): string {
  const sections = [formatBlock("SYMBOL", target)];
  for (const caller of callers) {
    sections.push(formatBlock("CALLER", caller));
  }
  for (const callee of callees) {
    sections.push(formatBlock("CALLEE", callee));
  }
  return sections.join("\n\n");
}

function formatBlock(label: string, node: GraphNode): string {
  return `// ${label}: ${node.name} (${node.filePath}:${node.startLine}-${node.endLine})\n${node.sourceCode}`;
}
