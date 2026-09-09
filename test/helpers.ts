import path from "node:path";
import { fileURLToPath } from "node:url";

export function fixturesDir(importMetaUrl: string, ...segments: string[]): string {
  const testDir = path.dirname(fileURLToPath(importMetaUrl));
  return path.join(testDir, "fixtures", ...segments);
}
