import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearSessionStore,
  getSessionState,
  setSessionState,
} from "../../features/session-state/session-store";
import { createCompactionTodoPreserverHandler } from "./handler";

type MutableTodoState = {
  todos?: Array<{
    content: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
  }>;
};

type GenericHook = (input: unknown, output?: unknown) => Promise<void>;

function seedTodos(sessionID: string, todos: NonNullable<MutableTodoState["todos"]>): void {
  setSessionState(sessionID, { status: "active" });
  const state = getSessionState(sessionID) as unknown as MutableTodoState | undefined;
  if (!state) return;
  state.todos = todos;
}

describe("createCompactionTodoPreserverHandler", () => {
  beforeEach(() => {
    clearSessionStore();
  });

  describe("#given a handler instance", () => {
    describe("#when session.compacted fires with todos present", () => {
      it("#then prepends a todo snapshot to output.context", async () => {
        const sessionID = "ses-compact-todos";
        seedTodos(sessionID, [
          { content: "Implement feature X", status: "pending" },
          { content: "Run lint", status: "in_progress" },
        ]);
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.compacted",
            properties: { sessionID },
          },
        };
        const output = { context: ["existing context"] };

        await handler(input, output);

        expect(output.context.length).toBe(2);
        expect(output.context[0]).toContain("compaction-todo-preserver");
        expect(output.context[0]).toContain("Implement feature X");
        expect(output.context[0]).toContain("Run lint");
        expect(output.context[1]).toBe("existing context");
      });
    });

    describe("#when session.compacting fires with todos", () => {
      it("#then also triggers since session.compacting is a compaction event", async () => {
        const sessionID = "ses-compacting";
        seedTodos(sessionID, [{ content: "Fix tests", status: "pending" }]);
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.compacting",
            properties: { sessionID },
          },
        };
        const output = { context: [] as string[] };

        await handler(input, output);

        expect(output.context.length).toBe(1);
        expect(output.context[0]).toContain("Fix tests");
      });
    });

    describe("#when experimental.session.compacting fires", () => {
      it("#then handles the experimental event type", async () => {
        const sessionID = "ses-exp-compact";
        seedTodos(sessionID, [{ content: "Experimental task", status: "in_progress" }]);
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "experimental.session.compacting",
            properties: { sessionID },
          },
        };
        const output = { context: [] as string[] };

        await handler(input, output);

        expect(output.context.length).toBe(1);
        expect(output.context[0]).toContain("Experimental task");
      });
    });

    describe("#when a non-compaction event fires", () => {
      it("#then does nothing", async () => {
        const sessionID = "ses-compact-noop";
        seedTodos(sessionID, [{ content: "Pending work", status: "pending" }]);
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.idle",
            properties: { sessionID },
          },
        };
        const output = { context: ["untouched"] };

        await handler(input, output);

        expect(output.context).toEqual(["untouched"]);
      });
    });

    describe("#when compaction fires but no todos exist", () => {
      it("#then does not prepend anything", async () => {
        const sessionID = "ses-compact-empty";
        setSessionState(sessionID, { status: "active" });
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.compacted",
            properties: { sessionID },
          },
        };
        const output = { context: ["original"] };

        await handler(input, output);

        expect(output.context).toEqual(["original"]);
      });
    });

    describe("#when output has no context array", () => {
      it("#then sets compactionContextPrefix instead", async () => {
        const sessionID = "ses-compact-no-ctx";
        seedTodos(sessionID, [{ content: "Fallback task", status: "pending" }]);
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.compacted",
            properties: { sessionID },
          },
        };
        const output = {} as Record<string, unknown>;

        await handler(input, output);

        expect(typeof output.compactionContextPrefix).toBe("string");
        expect(String(output.compactionContextPrefix)).toContain("Fallback task");
      });
    });
  });
});
