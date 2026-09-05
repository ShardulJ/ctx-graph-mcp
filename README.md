# ctx-graph-mcp

MCP server that gives Claude Code symbol-scoped context (a function/class and its
direct callers and callees) instead of full files, to cut token usage on large
repos.

## Adding to Claude Code

Once published:

```
claude mcp add ctx-graph-mcp -- npx ctx-graph-mcp
```

While developing locally, point it at the bin script directly instead:

```
claude mcp add ctx-graph-mcp -- node /absolute/path/to/ctx-graph-mcp/bin/ctx-graph-mcp.mjs
```

By default the server indexes `process.cwd()` at startup. To index a different repo, set `ROOT_DIR`:

```
claude mcp add ctx-graph-mcp --env ROOT_DIR=/path/to/other/repo -- npx ctx-graph-mcp
```

The server exposes one tool, `get_symbol_context`, which takes `{ filePath, symbolName }` and
returns that symbol's source plus the source of its direct callers and callees.
