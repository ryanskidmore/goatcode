import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { interactiveBashTool } from "./handler";

const mockContext = {
  sessionID: "session-1",
  messageID: "message-1",
  agent: "agent-1",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
} satisfies Parameters<ToolDefinition["execute"]>[1];

function makeProc(stdout: string, stderr: string, exitCode: number) {
  let exitResolve: (code: number) => void;
  const exitedPromise = new Promise<number>((resolve) => {
    exitResolve = resolve;
  });
  exitResolve!(exitCode);

  return {
    stdout: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(stdout));
        controller.close();
      },
    }),
    stderr: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(stderr));
        controller.close();
      },
    }),
    exited: exitedPromise,
    kill: () => {},
  };
}

describe("interactive_bash", () => {
  let spawnSpy: ReturnType<typeof spyOn<typeof Bun, "spawn">>;

  beforeEach(() => {
    spawnSpy = spyOn(Bun, "spawn");
  });

  afterEach(() => {
    spawnSpy.mockRestore();
  });

  describe("#given a valid tmux subcommand", () => {
    describe("#when the command succeeds", () => {
      it("#then it returns stdout output", async () => {
        spawnSpy.mockReturnValue(
          makeProc("session created\n", "", 0) as ReturnType<typeof Bun.spawn>,
        );

        const result = await interactiveBashTool.execute(
          { tmux_command: "new-session -d -s myapp" },
          mockContext,
        );

        expect(result).toBe("session created\n");
        expect(spawnSpy).toHaveBeenCalledWith(
          ["tmux", "new-session", "-d", "-s", "myapp"],
          expect.objectContaining({ stdout: "pipe", stderr: "pipe" }),
        );
      });
    });

    describe("#when the command produces no output", () => {
      it("#then it returns the no-output placeholder", async () => {
        spawnSpy.mockReturnValue(makeProc("", "", 0) as ReturnType<typeof Bun.spawn>);

        const result = await interactiveBashTool.execute(
          { tmux_command: "send-keys -t myapp q Enter" },
          mockContext,
        );

        expect(result).toBe("(no output)");
      });
    });

    describe("#when the command fails with stderr", () => {
      it("#then it returns the error message from stderr", async () => {
        spawnSpy.mockReturnValue(
          makeProc("", "no server running on /tmp/tmux-1000/default", 1) as ReturnType<
            typeof Bun.spawn
          >,
        );

        const result = await interactiveBashTool.execute(
          { tmux_command: "send-keys -t missing q" },
          mockContext,
        );

        expect(result).toBe("Error: no server running on /tmp/tmux-1000/default");
      });
    });

    describe("#when the command fails with no stderr", () => {
      it("#then it returns a generic exit code error", async () => {
        spawnSpy.mockReturnValue(makeProc("", "", 1) as ReturnType<typeof Bun.spawn>);

        const result = await interactiveBashTool.execute(
          { tmux_command: "kill-session -t myapp" },
          mockContext,
        );

        expect(result).toBe("Error: Command failed with exit code 1");
      });
    });
  });

  describe("#given a quoted tmux subcommand", () => {
    describe("#when the command contains quoted arguments", () => {
      it("#then it tokenizes quotes correctly and passes args to tmux", async () => {
        spawnSpy.mockReturnValue(makeProc("", "", 0) as ReturnType<typeof Bun.spawn>);

        await interactiveBashTool.execute(
          { tmux_command: 'send-keys -t myapp "vim file.ts" Enter' },
          mockContext,
        );

        expect(spawnSpy).toHaveBeenCalledWith(
          ["tmux", "send-keys", "-t", "myapp", "vim file.ts", "Enter"],
          expect.objectContaining({ stdout: "pipe", stderr: "pipe" }),
        );
      });
    });
  });

  describe("#given an empty tmux command", () => {
    describe("#when execute is called with an empty string", () => {
      it("#then it returns an empty command error", async () => {
        const result = await interactiveBashTool.execute({ tmux_command: "   " }, mockContext);

        expect(result).toBe("Error: Empty tmux command");
        expect(spawnSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given tmux is not installed", () => {
    describe("#when spawn throws ENOENT", () => {
      it("#then it returns a helpful not-installed error", async () => {
        spawnSpy.mockImplementation(() => {
          throw new Error("spawn ENOENT");
        });

        const result = await interactiveBashTool.execute(
          { tmux_command: "new-session -d -s test" },
          mockContext,
        );

        expect(result).toBe(
          "Error: tmux is not installed or not found in PATH. Install tmux to use this tool.",
        );
      });
    });
  });
});
