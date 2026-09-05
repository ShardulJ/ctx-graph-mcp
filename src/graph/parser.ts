// tree-sitter parsing, symbol extraction
import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";

type SyntaxNode = Parser.SyntaxNode;

export interface ExtractedSymbol {
  name: string;
  startLine: number;
  endLine: number;
  sourceCode: string;
  calledSymbolNames: string[];
}

function languageFor(filePath: string) {
  switch (path.extname(filePath)) {
    case ".tsx":
      return TypeScript.tsx;
    case ".ts":
      return TypeScript.typescript;
    case ".jsx":
    case ".js":
      return JavaScript;
    default:
      throw new Error(`Unsupported file extension for symbol extraction: ${filePath}`);
  }
}

export function extractSymbols(filePath: string): ExtractedSymbol[] {
  const source = fs.readFileSync(filePath, "utf8");
  const parser = new Parser();
  parser.setLanguage(languageFor(filePath));
  const tree = parser.parse(source);

  const symbols: ExtractedSymbol[] = [];
  for (const child of tree.rootNode.namedChildren) {
    if (child) {
      collectTopLevelSymbols(child, source, symbols);
    }
  }
  return symbols;
}

function collectTopLevelSymbols(node: SyntaxNode, source: string, out: ExtractedSymbol[]): void {
  const declaration = node.type === "export_statement" ? node.childForFieldName("declaration") : node;
  if (!declaration) {
    return;
  }

  if (declaration.type === "function_declaration") {
    const nameNode = declaration.childForFieldName("name");
    const bodyNode = declaration.childForFieldName("body");
    if (nameNode) {
      out.push(makeSymbol(nameNode.text, node, bodyNode, source));
    }
    return;
  }

  if (declaration.type === "class_declaration") {
    const classBody = declaration.childForFieldName("body");
    if (!classBody) {
      return;
    }
    for (const member of classBody.namedChildren) {
      if (member && member.type === "method_definition") {
        const nameNode = member.childForFieldName("name");
        const bodyNode = member.childForFieldName("body");
        if (nameNode) {
          out.push(makeSymbol(nameNode.text, member, bodyNode, source));
        }
      }
    }
    return;
  }

  if (declaration.type === "lexical_declaration") {
    for (const declarator of declaration.namedChildren) {
      if (!declarator || declarator.type !== "variable_declarator") {
        continue;
      }
      const nameNode = declarator.childForFieldName("name");
      const valueNode = declarator.childForFieldName("value");
      if (!nameNode || nameNode.type !== "identifier" || !valueNode) {
        continue;
      }
      if (valueNode.type === "arrow_function" || valueNode.type === "function_expression") {
        const bodyNode = valueNode.childForFieldName("body");
        out.push(makeSymbol(nameNode.text, node, bodyNode, source));
      }
    }
  }
}

function makeSymbol(
  name: string,
  rangeNode: SyntaxNode,
  bodyNode: SyntaxNode | null,
  source: string,
): ExtractedSymbol {
  return {
    name,
    startLine: rangeNode.startPosition.row + 1,
    endLine: rangeNode.endPosition.row + 1,
    sourceCode: source.slice(rangeNode.startIndex, rangeNode.endIndex),
    calledSymbolNames: bodyNode ? collectCalledSymbolNames(bodyNode) : [],
  };
}

function collectCalledSymbolNames(node: SyntaxNode): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  const visit = (current: SyntaxNode): void => {
    if (current.type === "call_expression") {
      const callee = current.childForFieldName("function");
      const name = calleeName(callee);
      if (name && !seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    for (const child of current.namedChildren) {
      if (child) {
        visit(child);
      }
    }
  };

  visit(node);
  return names;
}

function calleeName(node: SyntaxNode | null): string | null {
  if (!node) {
    return null;
  }
  if (node.type === "identifier") {
    return node.text;
  }
  if (node.type === "member_expression") {
    const property = node.childForFieldName("property");
    return property ? property.text : null;
  }
  return null;
}
