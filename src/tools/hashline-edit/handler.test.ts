import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeLineHash, formatHashLine } from "./hash-computation";
import { createMockToolContext } from "../../test-utils";
import { executeHashlineEdit } from "./handler";
import type { HashlineEditToolArgs } from "./types";

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

  describe("#given a file with valid hashline content", () => {
    describe("#when a valid edit is applied", () => {
      it("#then writes updated content and returns success message", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const hash = computeLineHash(2, "beta");
        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ oldString: formatHashLine(2, "beta"), newString: "BETA", hash }],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toContain("Applied 1 hashline edit(s)");
        expect(result).toContain(filePath);
        const updated = await readFile(filePath, "utf8");
        expect(updated).toBe("alpha\nBETA\ngamma");
      });
    });
  });

  describe("#given an edit that produces identical content", () => {
    describe("#when executeHashlineEdit is called", () => {
      it("#then returns 'No changes applied' and leaves content unchanged", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const hash = computeLineHash(2, "beta");
        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ oldString: formatHashLine(2, "beta"), newString: "beta", hash }],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toBe("No changes applied");
        const after = await readFile(filePath, "utf8");
        expect(after).toBe(content);
      });
    });
  });

  describe("#given a nonexistent file path", () => {
    describe("#when executeHashlineEdit is called", () => {
      it("#then returns an error message", async () => {
        const args: HashlineEditToolArgs = {
          filePath: join(tempDir, "does-not-exist.txt"),
          edits: [{ oldString: "1#ZZ|foo", newString: "bar", hash: "ZZ" }],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toStartWith("Error:");
      });
    });
  });

  describe("#given a stale hash that does not match file content", () => {
    describe("#when executeHashlineEdit is called", () => {
      it("#then returns a stale content error", async () => {
        const filePath = join(tempDir, "test.txt");
        const content = "alpha\nbeta\ngamma";
        await writeFile(filePath, content, "utf8");

        const realHash = computeLineHash(2, "beta");
        const wrongHash = realHash === "ZZ" ? "PP" : "ZZ";

        const args: HashlineEditToolArgs = {
          filePath,
          edits: [{ oldString: formatHashLine(2, "beta"), newString: "BETA", hash: wrongHash }],
        };

        const result = await executeHashlineEdit(args, ctx);

        expect(result).toContain("Error:");
        expect(result).toContain("stale content");
      });
    });
  });
});
