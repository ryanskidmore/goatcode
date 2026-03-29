import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { interactiveBashTool } from "./handler";
import { createMockToolContext } from "../../test-utils";

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

describe("interactiveBashTool", () => {
  let spawnSpy: ReturnType<typeof spyOn<typeof Bun, "spawn">>;
  const ctx = createMockToolContext();

  beforeEach(() => {
    spawnSpy = spyOn(Bun, "spawn");
  });

  afterEach(() => {
    spawnSpy.mockRestore();
  });

  describe("#given a valid tmux subcommand", () => {
    describe("#when the command executes successfully", () => {
      it("#then returns command output", async () => {
        spawnSpy.mockReturnValue(
          makeProc("pane contents here\n", "", 0) as ReturnType<typeof Bun.spawn>,
        );

        const result = await interactiveBashTool.execute(
          { tmux_command: "capture-pane -p -t myapp" },
          ctx,
        );

        expect(result).toBe("pane contents here\n");
        expect(spawnSpy).toHaveBeenCalledWith(
          ["tmux", "capture-pane", "-p", "-t", "myapp"],
          expect.objectContaining({ stdout: "pipe", stderr: "pipe" }),
        );
      });
    });

    describe("#when the command produces no output", () => {
      it("#then returns the no-output placeholder", async () => {
        spawnSpy.mockReturnValue(makeProc("", "", 0) as ReturnType<typeof Bun.spawn>);

        const result = await interactiveBashTool.execute(
          { tmux_command: "kill-session -t old" },
          ctx,
        );

        expect(result).toBe("(no output)");
      });
    });
  });

  describe("#given tmux is not installed", () => {
    describe("#when spawn throws ENOENT", () => {
      it("#then returns a helpful not-installed error", async () => {
        spawnSpy.mockImplementation(() => {
          throw new Error("spawn ENOENT");
        });

        const result = await interactiveBashTool.execute({ tmux_command: "list-sessions" }, ctx);

        expect(result).toBe(
          "Error: tmux is not installed or not found in PATH. Install tmux to use this tool.",
        );
        expect(spawnSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("#when spawn throws No such file", () => {
      it("#then returns a helpful not-installed error", async () => {
        spawnSpy.mockImplementation(() => {
          throw new Error("No such file or directory");
        });

        const result = await interactiveBashTool.execute({ tmux_command: "list-sessions" }, ctx);

        expect(result).toBe(
          "Error: tmux is not installed or not found in PATH. Install tmux to use this tool.",
        );
      });
    });
  });

  describe("#given a command that fails with stderr", () => {
    describe("#when the tmux process exits non-zero", () => {
      it("#then returns the stderr error message", async () => {
        spawnSpy.mockReturnValue(
          makeProc("", "session not found: myapp", 1) as ReturnType<typeof Bun.spawn>,
        );

        const result = await interactiveBashTool.execute({ tmux_command: "attach -t myapp" }, ctx);

        expect(result).toBe("Error: session not found: myapp");
      });
    });
  });

  describe("#given an empty tmux command", () => {
    describe("#when execute is called with whitespace only", () => {
      it("#then returns an empty command error without spawning", async () => {
        const result = await interactiveBashTool.execute({ tmux_command: "   " }, ctx);

        expect(result).toBe("Error: Empty tmux command");
        expect(spawnSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a command with a generic error", () => {
    describe("#when spawn throws an unexpected error", () => {
      it("#then returns the error message directly", async () => {
        spawnSpy.mockImplementation(() => {
          throw new Error("unexpected failure");
        });

        const result = await interactiveBashTool.execute(
          { tmux_command: "new-session -d -s test" },
          ctx,
        );

        expect(result).toBe("Error: unexpected failure");
      });
    });
  });
});
