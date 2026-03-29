import { describe, it, expect, mock } from "bun:test";
import { createLookAtTool } from "./handler";
import type { ToolDefinition } from "@opencode-ai/plugin";
import type { PollSnapshot } from "../../runtime";

type ToolContext = Parameters<ToolDefinition["execute"]>[1];

async function noopPoller(fetchSnapshot: () => Promise<PollSnapshot>): Promise<PollSnapshot> {
  return fetchSnapshot();
}

function makeToolContext(overrides: Record<string, unknown> = {}): ToolContext {
  return {
    sessionID: "session-test",
    messageID: "message-test",
    agent: "test-agent",
    directory: "/tmp",
    worktree: "/tmp",
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
    ...overrides,
  } as ToolContext;
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
          { role: "assistant", content: "Analysis result: found the requested info." },
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

function makeContextWithClient(client: ReturnType<typeof makeClient>): ToolContext {
  return makeToolContext({ client }) as ToolContext;
}

describe("lookAtTool", () => {
  describe("#given a text file path and goal", () => {
    describe("#when the file exists and Inspector agent responds", () => {
      it("#then it returns the assistant analysis result", async () => {
        const client = makeClient();
        const ctx = makeContextWithClient(client);
        const tool = createLookAtTool(noopPoller);

        await Bun.write("/tmp/look-at-test-file.txt", "Hello, this is test content.");

        const result = await tool.execute(
          { file_path: "/tmp/look-at-test-file.txt", goal: "find the greeting" },
          ctx,
        );

        expect(result).toBe("Analysis result: found the requested info.");
        expect(client.session.create).toHaveBeenCalledTimes(1);
        expect(client.session.promptAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("#given a file path that does not exist", () => {
    describe("#when execute is called", () => {
      it("#then it returns a file not found error", async () => {
        const client = makeClient();
        const ctx = makeContextWithClient(client);
        const tool = createLookAtTool(noopPoller);

        const result = await tool.execute(
          { file_path: "/tmp/nonexistent-look-at-file-xyz.txt", goal: "find something" },
          ctx,
        );

        expect(result).toContain("Error: File not found");
        expect(client.session.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given neither file_path nor image_data", () => {
    describe("#when execute is called", () => {
      it("#then it returns a validation error", async () => {
        const client = makeClient();
        const ctx = makeContextWithClient(client);
        const tool = createLookAtTool(noopPoller);

        const result = await tool.execute({ goal: "find something" }, ctx);

        expect(result).toContain("Error: Must provide either");
        expect(client.session.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given both file_path and image_data", () => {
    describe("#when execute is called", () => {
      it("#then it returns a validation error", async () => {
        const client = makeClient();
        const ctx = makeContextWithClient(client);
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

  describe("#given base64 image_data", () => {
    describe("#when execute is called with a valid base64 image", () => {
      it("#then it creates a session and returns the analysis", async () => {
        const client = makeClient();
        const ctx = makeContextWithClient(client);
        const tool = createLookAtTool(noopPoller);

        const fakeBase64 =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        const result = await tool.execute(
          { image_data: fakeBase64, goal: "describe the image" },
          ctx,
        );

        expect(result).toBe("Analysis result: found the requested info.");
        expect(client.session.create).toHaveBeenCalledTimes(1);
        expect(client.session.promptAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("#given session creation fails", () => {
    describe("#when execute is called", () => {
      it("#then it returns a session creation error", async () => {
        const client = makeClient({
          create: mock(async () => ({ data: null, error: "Unauthorized" })),
          promptAsync: mock(async () => ({ data: null, error: null })),
          messages: mock(async () => ({ data: [], error: null })),
          status: mock(async () => ({ data: {}, error: null })),
        });
        const ctx = makeContextWithClient(client);
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
      it("#then it returns a no response error", async () => {
        const client = makeClient({
          messages: mock(async () => ({
            data: [{ role: "user", content: "analyze this" }],
            error: null,
          })),
        });
        const ctx = makeContextWithClient(client);
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
