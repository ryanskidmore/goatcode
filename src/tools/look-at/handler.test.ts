import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createLookAtTool, extractLatestAssistantText } from "./handler";
import type { ToolDefinition } from "@opencode-ai/plugin";
import type { PollSnapshot } from "../../runtime";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

type ToolContext = Parameters<ToolDefinition["execute"]>[1];

async function noopPoller(fetchSnapshot: () => Promise<PollSnapshot>): Promise<PollSnapshot> {
  return fetchSnapshot();
}

function makeClient(sessionOverrides: Record<string, unknown> = {}) {
  return {
    session: {
      create: mock(async () => ({
        data: { id: "child-session-id" },
        error: null,
      })),
      promptAsync: mock(async () => ({ data: null, error: null })),
      messages: mock(async () => ({
        data: [
          { role: "user", content: "analyze this" },
          { role: "assistant", content: "Extracted info from the file." },
        ],
        error: null,
      })),
      status: mock(async () => ({
        data: { "child-session-id": { type: "idle" } },
        error: null,
      })),
      ...sessionOverrides,
    },
  };
}

function makeContext(client: ReturnType<typeof makeClient>): ToolContext {
  return {
    sessionID: "ses_test",
    messageID: "msg_test",
    agent: "test-agent",
    directory: "/tmp/test-project",
    worktree: "/tmp/test-project",
    abort: new AbortController().signal,
    metadata: mock(() => {}),
    ask: mock(async () => {}),
    client,
  } as unknown as ToolContext;
}

describe("lookAtTool", () => {
  describe("#given both file_path and image_data provided", () => {
    describe("#when execute is called with both", () => {
      it("#then returns XOR validation error", async () => {
        const client = makeClient();
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        const result = await tool.execute(
          {
            file_path: "/tmp/some-file.txt",
            image_data: "data:image/png;base64,abc123",
            goal: "find something",
          },
          ctx,
        );

        expect(result).toContain("Error: Provide only one of");
        expect(client.session.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given neither file_path nor image_data", () => {
    describe("#when execute is called with only a goal", () => {
      it("#then returns must-provide error", async () => {
        const client = makeClient();
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        const result = await tool.execute({ goal: "describe something" }, ctx);

        expect(result).toContain("Error: Must provide either");
        expect(client.session.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given missing goal parameter", () => {
    describe("#when execute is called without goal", () => {
      it("#then returns missing goal error", async () => {
        const client = makeClient();
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        const result = await tool.execute({ file_path: "/tmp/some-file.txt" }, ctx);

        expect(result).toContain("Error: Missing required parameter 'goal'");
        expect(client.session.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a text file path", () => {
    describe("#when the file exists and Inspector agent responds", () => {
      it("#then returns the assistant analysis result", async () => {
        const client = makeClient();
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        await Bun.write("/tmp/look-at-handler-test.txt", "Some test file content.");

        const result = await tool.execute(
          { file_path: "/tmp/look-at-handler-test.txt", goal: "summarize content" },
          ctx,
        );

        expect(result).toBe("Extracted info from the file.");
        expect(client.session.create).toHaveBeenCalledTimes(1);
        expect(client.session.promptAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("#given a file path that does not exist", () => {
    describe("#when execute is called", () => {
      it("#then returns file not found error", async () => {
        const client = makeClient();
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        const result = await tool.execute(
          { file_path: "/tmp/nonexistent-handler-test-xyz.txt", goal: "find data" },
          ctx,
        );

        expect(result).toContain("Error: File not found");
        expect(client.session.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given the poller times out", () => {
    describe("#when the Inspector agent never becomes idle", () => {
      it("#then returns a timeout error", async () => {
        const client = makeClient();
        const ctx = makeContext(client);

        const timeoutPoller = async () => {
          throw new Error("Polling timed out");
        };
        const tool = createLookAtTool(timeoutPoller);

        await Bun.write("/tmp/look-at-timeout-test.txt", "content");

        const result = await tool.execute(
          { file_path: "/tmp/look-at-timeout-test.txt", goal: "find data" },
          ctx,
        );

        expect(result).toContain("Error: Timed out waiting for Inspector agent response");
      });
    });
  });
});

describe("extractLatestAssistantText", () => {
  describe("#given messages with an assistant reply", () => {
    describe("#when called", () => {
      it("#then returns the last assistant message content", () => {
        const messages = [
          { role: "user", content: "hello" },
          { role: "assistant", content: "first reply" },
          { role: "user", content: "follow up" },
          { role: "assistant", content: "second reply" },
        ];
        expect(extractLatestAssistantText(messages)).toBe("second reply");
      });
    });
  });

  describe("#given messages with no assistant reply", () => {
    describe("#when called", () => {
      it("#then returns null", () => {
        const messages = [{ role: "user", content: "hello" }];
        expect(extractLatestAssistantText(messages)).toBeNull();
      });
    });
  });
});

// ─── T151: look_at rejects text files over 1 MB ──────────────────────────────

describe("T151 — look_at text file size limit", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "look-at-size-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for text file exceeding 1 MB", async () => {
    const { createLookAtTool } = await import("./handler");
    const { createMockToolContext } = await import("../../test-utils");

    const overSizeFile = join(tempDir, "big.ts");
    await writeFile(overSizeFile, "x".repeat(1024 * 1024 + 1));

    const tool = createLookAtTool(async () => ({ messageCount: 0, isIdle: true }));
    const ctx = createMockToolContext() as never;

    const result = await tool.execute({ file_path: overSizeFile, goal: "summarise" }, ctx);

    expect(result).toMatch(/too large/i);
    expect(result).toMatch(/1 MB/i);
  });

  it("allows text files exactly at 1 MB and forwards to session client", async () => {
    const exactBoundaryFile = join(tempDir, "exactly-1mb.ts");
    await writeFile(exactBoundaryFile, "x".repeat(1024 * 1024));

    const client = makeClient();
    const ctx = makeContext(client);
    const tool = createLookAtTool(noopPoller);

    const result = await tool.execute({ file_path: exactBoundaryFile, goal: "summarise" }, ctx);

    expect(result).toBe("Extracted info from the file.");
    expect(client.session.create).toHaveBeenCalledTimes(1);
    expect(client.session.promptAsync).toHaveBeenCalledTimes(1);
  });
});

describe("lookAtTool — additional scenarios", () => {
  describe("#given base64 image_data", () => {
    describe("#when execute is called with a valid base64 image", () => {
      it("#then creates a session and returns the analysis", async () => {
        const client = makeClient();
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);
        const fakeBase64 =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        const result = await tool.execute(
          { image_data: fakeBase64, goal: "describe the image" },
          ctx,
        );

        expect(result).toBe("Extracted info from the file.");
        expect(client.session.create).toHaveBeenCalledTimes(1);
        expect(client.session.promptAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("#given session creation fails", () => {
    describe("#when execute is called", () => {
      it("#then returns a session creation error", async () => {
        const client = makeClient({
          create: mock(async () => ({ data: null, error: "Unauthorized" })),
          promptAsync: mock(async () => ({ data: null, error: null })),
          messages: mock(async () => ({ data: [], error: null })),
          status: mock(async () => ({ data: {}, error: null })),
        });
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        await Bun.write("/tmp/look-at-session-fail-test.txt", "content");

        const result = await tool.execute(
          { file_path: "/tmp/look-at-session-fail-test.txt", goal: "find something" },
          ctx,
        );

        expect(result).toContain("Error: Failed to create session");
      });
    });
  });

  describe("#given the Inspector agent returns no assistant message", () => {
    describe("#when execute is called", () => {
      it("#then returns a no response error", async () => {
        const client = makeClient({
          messages: mock(async () => ({
            data: [{ role: "user", content: "analyze this" }],
            error: null,
          })),
        });
        const ctx = makeContext(client);
        const tool = createLookAtTool(noopPoller);

        await Bun.write("/tmp/look-at-no-response-test.txt", "content");

        const result = await tool.execute(
          { file_path: "/tmp/look-at-no-response-test.txt", goal: "find something" },
          ctx,
        );

        expect(result).toContain("Error: No response from Inspector agent");
      });
    });
  });
});
