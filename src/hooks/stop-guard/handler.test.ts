import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearSessionStore,
  getSessionState,
  setSessionState,
} from "../../features/session-state/session-store";
import { createStopGuardHandler } from "./handler";

type MutableTodoState = {
  todos?: Array<{
    content: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
  }>;
};

type GenericHook = (input: unknown) => Promise<void>;

function seedTodos(sessionID: string, todos: NonNullable<MutableTodoState["todos"]>): void {
  setSessionState(sessionID, { status: "active" });
  const state = getSessionState(sessionID) as unknown as MutableTodoState | undefined;
  if (!state) return;
  state.todos = todos;
}

describe("createStopGuardHandler", () => {
  beforeEach(() => {
    clearSessionStore();
  });

  describe("#given a handler instance", () => {
    describe("#when a stop-like message arrives with pending todos", () => {
      it("#then injects a stopGuardMessage referencing the next todo", async () => {
        const sessionID = "ses-stop-pending";
        seedTodos(sessionID, [{ content: "Finish verification step", status: "pending" }]);
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = {
          sessionID,
          message: "I'm done.",
        } as Record<string, unknown>;

        await handler(input);

        expect(typeof input.stopGuardMessage).toBe("string");
        expect(String(input.stopGuardMessage)).toContain("Finish verification step");
        expect(String(input.stopGuardMessage)).toContain("stop-guard");
      });
    });

    describe("#when message matches 'task complete' pattern", () => {
      it("#then also triggers the guard", async () => {
        const sessionID = "ses-stop-taskcomplete";
        seedTodos(sessionID, [{ content: "Run final build", status: "in_progress" }]);
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = {
          sessionID,
          message: "Task complete, moving on.",
        } as Record<string, unknown>;

        await handler(input);

        expect(typeof input.stopGuardMessage).toBe("string");
        expect(String(input.stopGuardMessage)).toContain("Run final build");
      });
    });

    describe("#when message matches 'all done' pattern", () => {
      it("#then triggers for this stop pattern too", async () => {
        const sessionID = "ses-stop-alldone";
        seedTodos(sessionID, [{ content: "Deploy to staging", status: "pending" }]);
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = {
          sessionID,
          content: "All done here!",
        } as Record<string, unknown>;

        await handler(input);

        expect(typeof input.stopGuardMessage).toBe("string");
        expect(String(input.stopGuardMessage)).toContain("Deploy to staging");
      });
    });

    describe("#when a non-stop message arrives with pending todos", () => {
      it("#then does not inject a guard message", async () => {
        const sessionID = "ses-stop-normal";
        seedTodos(sessionID, [{ content: "Some pending work", status: "pending" }]);
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = {
          sessionID,
          message: "Please continue working on the next item.",
        } as Record<string, unknown>;

        await handler(input);

        expect(input.stopGuardMessage).toBeUndefined();
      });
    });

    describe("#when a stop-like message arrives but no pending todos", () => {
      it("#then does not inject a guard message", async () => {
        const sessionID = "ses-stop-empty";
        seedTodos(sessionID, [
          { content: "Already done", status: "completed" },
          { content: "Cancelled item", status: "cancelled" },
        ]);
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = {
          sessionID,
          message: "I'm done.",
        } as Record<string, unknown>;

        await handler(input);

        expect(input.stopGuardMessage).toBeUndefined();
      });
    });

    describe("#when sessionID is on the nested message object", () => {
      it("#then resolves the sessionID from message.sessionID", async () => {
        const sessionID = "ses-stop-nested";
        seedTodos(sessionID, [{ content: "Pending nested", status: "pending" }]);
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = {
          message: { sessionID, content: "Work is complete now." },
        } as Record<string, unknown>;

        await handler(input);

        expect(typeof input.stopGuardMessage).toBe("string");
        expect(String(input.stopGuardMessage)).toContain("Pending nested");
      });
    });

    describe("#when input has no sessionID at all", () => {
      it("#then does nothing", async () => {
        const handler = createStopGuardHandler() as unknown as GenericHook;
        const input = { message: "I'm done." } as Record<string, unknown>;

        await handler(input);

        expect(input.stopGuardMessage).toBeUndefined();
      });
    });
  });
});
