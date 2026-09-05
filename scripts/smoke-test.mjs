import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repoRoot, "test", "fixtures", "multi");
const binPath = path.join(repoRoot, "bin", "ctx-graph-mcp.mjs");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [binPath],
  cwd: repoRoot,
  env: { ...process.env, ROOT_DIR: fixtureRoot },
});

const client = new Client({ name: "ctx-graph-mcp-smoke-test", version: "0.0.0" });

try {
  await client.connect(transport);
  console.log("server started and completed the MCP handshake");

  const { tools } = await client.listTools();
  const toolNames = tools.map((tool) => tool.name);
  if (!toolNames.includes("get_symbol_context")) {
    throw new Error(`expected get_symbol_context to be registered, got: ${toolNames.join(", ")}`);
  }
  console.log("get_symbol_context tool is registered");

  const result = await client.callTool({
    name: "get_symbol_context",
    arguments: {
      filePath: path.join(fixtureRoot, "orders.ts"),
      symbolName: "validateOrder",
    },
  });

  if (result.isError) {
    throw new Error(`tool call reported an error: ${JSON.stringify(result.content)}`);
  }

  const text = result.content?.[0]?.text ?? "";
  if (!text.includes("SYMBOL: validateOrder") || !text.includes("CALLEE: isPositiveAmount")) {
    throw new Error(`unexpected tool output:\n${text}`);
  }

  console.log("get_symbol_context resolved validateOrder with its cross-file callees");
  console.log("\nsmoke test passed");
} finally {
  await client.close();
}
