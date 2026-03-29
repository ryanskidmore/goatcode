import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createWriteFileGuardHandler, BLOCK_MESSAGE } from "./handler";

describe("createWriteFileGuardHandler", () => {
  let tempDir: string;

  const createFile = (relativePath: string, content = "existing"): string => {
    const abs = join(tempDir, relativePath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    return abs;
  };

  const invokePreToolUse = async (
    handler: ReturnType<typeof createWriteFileGuardHandler>,
    opts: { tool: string; sessionID?: string; filePath: string },
  ): Promise<void> => {
    const input = {
      tool: opts.tool,
      sessionID: opts.sessionID ?? "ses_default",
      callID: "call_1",
    };
    const output = { args: { filePath: opts.filePath } };
    await handler.preToolUse(input, output);
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "wfg-handler-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("#given a handler instance", () => {
    describe("#when writing to an existing file without prior read", () => {
      it("#then throws a block error", async () => {
        const handler = createWriteFileGuardHandler(tempDir);
        const existingFile = createFile("no-read.txt");

        await expect(
          invokePreToolUse(handler, { tool: "write", filePath: existingFile }),
        ).rejects.toThrow(BLOCK_MESSAGE);
      });
    });

    describe("#when writing to a file that was read first", () => {
      it("#then allows the write", async () => {
        const handler = createWriteFileGuardHandler(tempDir);
        const existingFile = createFile("read-first.txt");
        const sessionID = "ses_read_write";

        await invokePreToolUse(handler, { tool: "read", sessionID, filePath: existingFile });

        await expect(
          invokePreToolUse(handler, { tool: "write", sessionID, filePath: existingFile }),
        ).resolves.toBeUndefined();
      });
    });

    describe("#when session.deleted event fires after a read", () => {
      it("#then clears session data and blocks subsequent write", async () => {
        const handler = createWriteFileGuardHandler(tempDir);
        const existingFile = createFile("cleanup.txt");
        const sessionID = "ses_to_delete";

        await invokePreToolUse(handler, { tool: "read", sessionID, filePath: existingFile });

        await handler.event({
          event: {
            type: "session.deleted",
            properties: { info: { id: sessionID } },
          },
        });

        await expect(
          invokePreToolUse(handler, { tool: "write", sessionID, filePath: existingFile }),
        ).rejects.toThrow(BLOCK_MESSAGE);
      });
    });

    describe("#when the tool is neither write nor read", () => {
      it("#then does nothing", async () => {
        const handler = createWriteFileGuardHandler(tempDir);
        const existingFile = createFile("ignored.txt");

        await expect(
          invokePreToolUse(handler, { tool: "bash", filePath: existingFile }),
        ).resolves.toBeUndefined();
      });
    });

    describe("#when writing to a file that does not exist", () => {
      it("#then allows the write (new file creation)", async () => {
        const handler = createWriteFileGuardHandler(tempDir);
        const newFile = join(tempDir, "brand-new.txt");

        await expect(
          invokePreToolUse(handler, { tool: "write", filePath: newFile }),
        ).resolves.toBeUndefined();
      });
    });
  });
});
