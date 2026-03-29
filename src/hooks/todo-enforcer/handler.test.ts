import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearSessionStore,
  getSessionState,
  setSessionState,
} from "../../features/session-state/session-store";
import { createTodoEnforcerHandler } from "./handler";

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

describe("createTodoEnforcerHandler", () => {
  beforeEach(() => {
    clearSessionStore();
  });

  describe("#given a handler instance", () => {
    describe("#when session.idle fires with pending todos", () => {
      it("#then injects a continuation message referencing the next pending todo", async () => {
        const sessionID = "ses-enforcer-pending";
        seedTodos(sessionID, [
          { content: "Run type-check", status: "pending" },
          { content: "Deploy artifacts", status: "pending" },
        ]);
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.idle",
            properties: { sessionID },
          },
        };

        await handler(input);

        const props = input.event.properties as Record<string, unknown>;
        expect(typeof props.continuationMessage).toBe("string");
        expect(String(props.continuationMessage)).toContain("Run type-check");
        expect(String(props.continuationMessage)).toContain("todo-enforcer");
      });
    });

    describe("#when session.idle fires with only completed/cancelled todos", () => {
      it("#then does not inject a continuation message", async () => {
        const sessionID = "ses-enforcer-done";
        seedTodos(sessionID, [
          { content: "Finished task", status: "completed" },
          { content: "Dropped task", status: "cancelled" },
        ]);
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.idle",
            properties: { sessionID },
          },
        };

        await handler(input);

        const props = input.event.properties as Record<string, unknown>;
        expect(props.continuationMessage).toBeUndefined();
      });
    });

    describe("#when event type is not session.idle", () => {
      it("#then does nothing", async () => {
        const sessionID = "ses-enforcer-wrong-event";
        seedTodos(sessionID, [{ content: "Pending work", status: "pending" }]);
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.error",
            properties: { sessionID },
          },
        };

        await handler(input);

        const props = input.event.properties as Record<string, unknown>;
        expect(props.continuationMessage).toBeUndefined();
      });
    });

    describe("#when input is not a valid event envelope", () => {
      it("#then does nothing for null input", async () => {
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        await handler(null);
      });

      it("#then does nothing for input without event", async () => {
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        const input = { something: "else" };
        await handler(input);
        expect((input as Record<string, unknown>).continuationMessage).toBeUndefined();
      });
    });

    describe("#when session.idle fires with in_progress todos", () => {
      it("#then treats in_progress as pending and injects continuation", async () => {
        const sessionID = "ses-enforcer-inprogress";
        seedTodos(sessionID, [
          { content: "Write tests", status: "in_progress" },
          { content: "Review PR", status: "completed" },
        ]);
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.idle",
            properties: { sessionID },
          },
        };

        await handler(input);

        const props = input.event.properties as Record<string, unknown>;
        expect(typeof props.continuationMessage).toBe("string");
        expect(String(props.continuationMessage)).toContain("Write tests");
      });
    });

    describe("#when sessionID is in info.id instead of properties.sessionID", () => {
      it("#then resolves the session ID from info.id", async () => {
        const sessionID = "ses-enforcer-info-id";
        seedTodos(sessionID, [{ content: "Fix lint errors", status: "pending" }]);
        const handler = createTodoEnforcerHandler() as unknown as GenericHook;
        const input = {
          event: {
            type: "session.idle",
            properties: { info: { id: sessionID } },
          },
        };

        await handler(input);

        const props = input.event.properties as Record<string, unknown>;
        expect(typeof props.continuationMessage).toBe("string");
        expect(String(props.continuationMessage)).toContain("Fix lint errors");
      });
    });
  });
});
