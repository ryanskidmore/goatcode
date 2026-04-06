import { describe, expect, test, mock, afterAll } from "bun:test";

import { spawnBackgroundSession } from "./spawner";
import type { OpenCodeContext } from "../../types/plugin";

afterAll(() => {
  mock.restore();
});
describe("spawnBackgroundSession", () => {
  test("#given parent session metadata #then creates child session with parentID and title", async () => {
    //#given
    const create = mock(async () => ({ data: { id: "ses_child_123" } }));
    const promptAsync = mock(async () => ({ data: {} }));
    const ctx = {
      directory: "/tmp/project",
      client: {
        session: {
          create,
          promptAsync,
        },
      },
    } as unknown as OpenCodeContext;

    //#when
    const result = await spawnBackgroundSession(ctx, {
      id: "task_abc",
      prompt: "investigate issue",
      model: "gpt-5.4-mini",
      parentSessionID: "ses_parent_456",
      title: "Investigate issue (@deepworker subagent)",
    });

    //#then
    expect(result).toEqual({ sessionId: "ses_child_123" });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      body: {
        title: "Investigate issue (@deepworker subagent)",
        parentID: "ses_parent_456",
      },
      query: {
        directory: "/tmp/project",
      },
    });
    expect(promptAsync).toHaveBeenCalledTimes(1);
  });
});
