import { describe, it, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  createHashlineDiffEnhancerBeforeHandler,
  createHashlineDiffEnhancerAfterHandler,
  createHashlineDiffEnhancerHandlers,
} from "./handler";

const HASHLINE_PATTERN = /^[0-9]+#[ZPMQVRWSNKTXJBYH]{2}\|/;

describe("createHashlineDiffEnhancerHandlers", () => {
  describe("#given a Write tool that modifies an existing file", () => {
    describe("#when before and after handlers both run", () => {
      it("#then metadata contains diff, hashlined content, and filediff", async () => {
        const beforeHandler = createHashlineDiffEnhancerBeforeHandler();
        const afterHandler = createHashlineDiffEnhancerAfterHandler();

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-diff-"));
        const filePath = path.join(tempDir, "test.ts");
        fs.writeFileSync(filePath, "const a = 1\nconst b = 2\n");

        const sessionID = "s1";
        const callID = "c1";
        const beforeInput = { tool: "write", sessionID, callID };
        const beforeOutput = { args: { filePath } };

        await beforeHandler(beforeInput, beforeOutput);

        fs.writeFileSync(filePath, "const a = 1\nconst b = 2\nconst c = 3\n");

        const afterInput = { tool: "write", sessionID, callID, args: {} };
        const afterOutput = {
          title: "write",
          output: "File written successfully.",
          metadata: {} as Record<string, unknown>,
        };

        await afterHandler(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeDefined();
        expect(typeof afterOutput.metadata.diff).toBe("string");
        expect(afterOutput.metadata.hashlined).toBeDefined();
        const hashlined = afterOutput.metadata.hashlined as string;
        expect(hashlined).toMatch(HASHLINE_PATTERN);
        expect(afterOutput.metadata.filediff).toBeDefined();
        expect(afterOutput.title).toBe(filePath);

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });

  describe("#given a non-Write tool", () => {
    describe("#when the before handler processes the input", () => {
      it("#then does not capture any state and after handler is a no-op", async () => {
        const beforeHandler = createHashlineDiffEnhancerBeforeHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c2" };
        const output = { args: { filePath: "/some/file.ts" } };

        await beforeHandler(input, output);

        const afterHandler = createHashlineDiffEnhancerAfterHandler();
        const afterInput = { tool: "read", sessionID: "s1", callID: "c2", args: {} };
        const afterOutput = {
          title: "read",
          output: "file content",
          metadata: {} as Record<string, unknown>,
        };

        await afterHandler(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeUndefined();
        expect(afterOutput.metadata.hashlined).toBeUndefined();
      });
    });
  });

  describe("#given after handler called without prior before capture", () => {
    describe("#when a different callID is used", () => {
      it("#then after handler produces no diff metadata", async () => {
        const afterHandler = createHashlineDiffEnhancerAfterHandler();
        const afterInput = { tool: "write", sessionID: "s1", callID: "c-no-before", args: {} };
        const afterOutput = {
          title: "write",
          output: "File written successfully.",
          metadata: {} as Record<string, unknown>,
        };

        await afterHandler(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeUndefined();
        expect(afterOutput.metadata.hashlined).toBeUndefined();
        expect(afterOutput.title).toBe("write");
      });
    });
  });

  describe("#given a Write tool targeting a new file", () => {
    describe("#when before captures empty content and after reads the written file", () => {
      it("#then diff reflects all lines as additions", async () => {
        const { before, after } = createHashlineDiffEnhancerHandlers();

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-diff-new-"));
        const filePath = path.join(tempDir, "new-file.ts");

        const sessionID = "s2";
        const callID = "c3";
        const beforeInput = { tool: "write", sessionID, callID };
        const beforeOutput = { args: { filePath } };

        await before(beforeInput, beforeOutput);

        fs.writeFileSync(filePath, "line one\nline two\nline three\n");

        const afterInput = { tool: "write", sessionID, callID, args: {} };
        const afterOutput = {
          title: "write",
          output: "File written successfully.",
          metadata: {} as Record<string, unknown>,
        };

        await after(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeDefined();
        const diff = afterOutput.metadata.diff as string;
        expect(diff).toContain("+3 additions");
        expect(diff).toContain("-0 deletions");
        expect(afterOutput.metadata.hashlined).toBeDefined();
        expect(afterOutput.title).toBe(filePath);

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });

  describe("#given missing sessionID or callID", () => {
    describe("#when the before handler receives incomplete input", () => {
      it("#then does not capture state", async () => {
        const beforeHandler = createHashlineDiffEnhancerBeforeHandler();
        const afterHandler = createHashlineDiffEnhancerAfterHandler();

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-diff-noid-"));
        const filePath = path.join(tempDir, "test.ts");
        fs.writeFileSync(filePath, "content\n");

        const beforeInput = { tool: "write", sessionID: "", callID: "" };
        const beforeOutput = { args: { filePath } };
        await beforeHandler(beforeInput, beforeOutput);

        const afterInput = { tool: "write", sessionID: "", callID: "", args: {} };
        const afterOutput = {
          title: "write",
          output: "File written successfully.",
          metadata: {} as Record<string, unknown>,
        };
        await afterHandler(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeUndefined();

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });
});
