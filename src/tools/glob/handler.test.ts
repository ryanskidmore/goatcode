import { afterEach, beforeEach, describe, it, expect, mock } from "bun:test";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGlobTool } from "./handler";
import { createMockToolContext } from "../../test-utils";

describe("globTool", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "goatcode-glob-handler-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("#given files matching a pattern", () => {
    describe("#when scanner returns matches", () => {
      it("#then returns files sorted by modification time (newest first)", async () => {
        await writeFile(join(tempDir, "old.ts"), "export const old = true");
        await writeFile(join(tempDir, "new.ts"), "export const newer = true");
        const now = Date.now() / 1000;
        await utimes(join(tempDir, "old.ts"), now - 10, now - 10);
        await utimes(join(tempDir, "new.ts"), now, now);

        const scanner = mock(async () => ["old.ts", "new.ts"]);
        const tool = createGlobTool(scanner);
        const ctx = createMockToolContext({ directory: tempDir });

        const result = await tool.execute({ pattern: "*.ts" }, ctx);

        expect(scanner).toHaveBeenCalledTimes(1);
        const lines = String(result).split("\n");
        expect(lines[0]).toBe(join(tempDir, "new.ts"));
        expect(lines[1]).toBe(join(tempDir, "old.ts"));
      });
    });
  });

  describe("#given more files than the maximum limit", () => {
    describe("#when scanner returns over 100 files", () => {
      it("#then returns at most 100 files", async () => {
        const totalFiles = 105;
        const fileNames: string[] = [];
        for (let i = 0; i < totalFiles; i++) {
          const name = `file-${i.toString().padStart(3, "0")}.ts`;
          fileNames.push(name);
          await writeFile(join(tempDir, name), "");
        }

        const scanner = mock(async () => fileNames);
        const tool = createGlobTool(scanner);
        const ctx = createMockToolContext({ directory: tempDir });

        const result = await tool.execute({ pattern: "*.ts" }, ctx);

        const lines = String(result).split("\n").filter((l) => l.length > 0);
        expect(lines.length).toBe(100);
      });
    });
  });

  describe("#given a pattern matching no files", () => {
    describe("#when scanner returns empty array", () => {
      it("#then returns no files found message", async () => {
        const scanner = mock(async () => []);
        const tool = createGlobTool(scanner);
        const ctx = createMockToolContext({ directory: tempDir });

        const result = await tool.execute({ pattern: "*.xyz" }, ctx);

        expect(result).toBe("No files found");
      });
    });
  });
});
