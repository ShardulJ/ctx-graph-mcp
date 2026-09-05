# ctx-graph-mcp

MCP server that gives Claude Code symbol-scoped context (a function/class + its 
direct callers and callees) instead of full files, to cut token usage on large 
repos.

## Architecture
- src/graph/parser.ts — tree-sitter based symbol extraction per file
- src/graph/graph-builder.ts — builds an in-memory call graph across a repo
- src/graph/cache.ts — persists the graph to disk, keyed by file content hash
- src/tools/get-context.ts — MCP tool: given {filePath, symbolName}, returns 
  the symbol's source + direct callers/callees, not the whole file
- src/index.ts — MCP server bootstrap, stdio transport

## Status
v1 scope: TypeScript/JavaScript only, single-repo, no incremental watch yet.

## Conventions
- No dashes in comments/docs. Plain, direct language.
- Test fixtures live in test/fixtures — real-ish small TS files, not toy examples.