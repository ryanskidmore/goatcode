import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeLineHash } from "./hash-computation";
import { createMockToolContext } from "../../test-utils";
import { executeHashlineEdit } from "./handler";
import type { HashlineEditToolArgs } from "./types";

function tag(line: number, content: string): string {
  return `${line}#${computeLineHash(line, content)}`;
}

describe("executeHashlineEdit", () => {
  let tempDir: string;
  let ctx: ReturnType<typeof createMockToolContext>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hashline-handler-test-"));
    ctx = createMockToolContext();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ─── replace_line ───────────────────────────────────────────
  describe("#given a file with valid hashline content", () => {
    describe("#when a replace_line edit is applied", () => {
      it("#then writes updated content and returns success message", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ op: "replace_line", pos: tag(2, "beta"), lines: ["BETA"] }],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toContain("Applied 1 hashline edit(s)");
        expect(result).toContain(filePath);
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("alpha\nBETA\ngamma");
      });
    });
  });

  // ─── replace_range ──────────────────────────────────────────
  describe("#given a file with multiple lines", () => {
    describe("#when a replace_range edit is applied", () => {
      it("#then replaces the range and writes result", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "line1\nline2\nline3\nline4\nline5";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [
            {
              op: "replace_range",
              pos: tag(2, "line2"),
              end: tag(4, "line4"),
              lines: ["REPLACED"],
            },
          ],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toContain("Applied 1 hashline edit(s)");
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("line1\nREPLACED\nline5");
      });
    });
  });

  // ─── append_at ──────────────────────────────────────────────
  describe("#given an append_at operation", () => {
    describe("#when inserting lines after an anchor", () => {
      it("#then inserts correctly and writes result", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [
            {
              op: "append_at",
              pos: tag(2, "beta"),
              lines: ["inserted1", "inserted2"],
            },
          ],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toContain("Applied 1 hashline edit(s)");
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("alpha\nbeta\ninserted1\ninserted2\ngamma");
      });
    });
  });

  // ─── prepend_at ─────────────────────────────────────────────
  describe("#given a prepend_at operation", () => {
    describe("#when inserting lines before an anchor", () => {
      it("#then inserts correctly and writes result", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [
            {
              op: "prepend_at",
              pos: tag(2, "beta"),
              lines: ["inserted"],
            },
          ],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toContain("Applied 1 hashline edit(s)");
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("alpha\ninserted\nbeta\ngamma");
      });
    });
  });

  // ─── append_file / prepend_file ─────────────────────────────
  describe("#given append_file and prepend_file operations", () => {
    describe("#when appending to end of file", () => {
      it("#then adds lines at end", async () => {
        const filePath = join(tempDir, "test.txt");
        await writeFile(filePath, "existing", "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ op: "append_file", lines: ["appended"] }],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Applied 1 hashline edit(s)");
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("existing\nappended");
      });
    });

    describe("#when prepending to start of file", () => {
      it("#then adds lines at start", async () => {
        const filePath = join(tempDir, "test.txt");
        await writeFile(filePath, "existing", "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ op: "prepend_file", lines: ["prepended"] }],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Applied 1 hashline edit(s)");
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("prepended\nexisting");
      });
    });

    describe("#when file does not exist", () => {
      it("#then creates the file with append_file", async () => {
        const filePath = join(tempDir, "new-file.txt");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ op: "append_file", lines: ["created"] }],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Applied 1 hashline edit(s)");
        const created = await readFile(filePath, "utf8");
        expect(created).toBe("created");
      });
    });
  });

  // ─── Error Cases ────────────────────────────────────────────
  describe("#given an edit that produces identical content", () => {
    describe("#when executeHashlineEdit is called", () => {
      it("#then returns no-changes error", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ op: "replace_line", pos: tag(2, "beta"), lines: ["beta"] }],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Error:");
        expect(result).toContain("No changes");
      });
    });
  });

  describe("#given a nonexistent file path", () => {
    describe("#when a non-file-creating edit is attempted", () => {
      it("#then returns an error message", async () => {
        const args: HashlineEditToolArgs = {
          filePath: join(tempDir, "does-not-exist.txt"),
          edits: [{ op: "replace_line", pos: "1#ZZ", lines: ["bar"] }],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Error:");
        expect(result).toContain("File not found");
      });
    });
  });

  describe("#given a stale hash that does not match file content", () => {
    describe("#when executeHashlineEdit is called", () => {
      it("#then returns a hash mismatch error with recovery hint", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const realHash = computeLineHash(2, "beta");
        const wrongHash = realHash === "ZZ" ? "PP" : "ZZ";

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ op: "replace_line", pos: `2#${wrongHash}`, lines: ["BETA"] }],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Error:");
        expect(result).toContain("hash mismatch");
        expect(result).toContain("Tip:");
      });
    });
  });

  describe("#given empty edits array", () => {
    describe("#when executeHashlineEdit is called", () => {
      it("#then returns validation error", async () => {
        const args: HashlineEditToolArgs = {
          filePath: join(tempDir, "test.txt"),
          edits: [],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Error:");
        expect(result).toContain("non-empty");
      });
    });
  });

  // ─── Multiple Mixed Edits ───────────────────────────────────
  describe("#given multiple edits of different types", () => {
    describe("#when applied in one call", () => {
      it("#then all edits are applied correctly", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "line1\nline2\nline3\nline4\nline5";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [
            { op: "replace_line", pos: tag(2, "line2"), lines: ["LINE2"] },
            { op: "append_at", pos: tag(4, "line4"), lines: ["inserted"] },
            { op: "prepend_file", lines: ["header"] },
          ],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Applied 3 hashline edit(s)");
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("header\nline1\nLINE2\nline3\nline4\ninserted\nline5");
      });
    });
  });

  // ─── Warnings in Output ─────────────────────────────────────
  describe("#given an edit with boundary duplication", () => {
    describe("#when the edit is applied", () => {
      it("#then includes warning in the response", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "function foo() {\n  return 1;\n}";
        await writeFile(filePath, content, "utf8");

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [
            {
              op: "replace_line",
              pos: tag(2, "  return 1;"),
              lines: ["  return 2;", "}"],
            },
          ],
        };

        const result = await executeHashlineEdit(args, ctx);
        expect(result).toContain("Applied 1 hashline edit(s)");
        expect(result).toContain("Warning");
        expect(result).toContain("boundary duplication");
      });
    });
  });
});
