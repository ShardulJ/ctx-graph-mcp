// MCP server entry, stdio transport
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadOrBuildGraph } from "./graph/cache.js";
import { getSymbolContext } from "./tools/get-context.js";

const rootDir = process.env.ROOT_DIR ?? process.cwd();
const graph = loadOrBuildGraph(rootDir);

const server = new McpServer({
  name: "ctx-graph-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_symbol_context",
  {
    description:
      "Given a file path and a function or class method name, returns that symbol's source code " +
      "plus the source of its direct callers and callees, instead of the whole file.",
    inputSchema: {
      filePath: z.string().describe("Path to the file containing the symbol, absolute or relative to the project root"),
      symbolName: z.string().describe("Name of the function or class method to look up"),
    },
  },
  (args) => getSymbolContext(graph, rootDir, args),
);

const transport = new StdioServerTransport();
await server.connect(transport);
