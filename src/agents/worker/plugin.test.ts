import { describe, it, expect } from "bun:test";
import { workerPlugin } from "./plugin";

describe("workerPlugin", () => {
  describe("#given the worker plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(workerPlugin.name).toBe("worker");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'subagent'", () => {
        const agent = workerPlugin.agents!.worker;
        expect(agent.mode).toBe("subagent");
      });

      it("#then has a temperature and non-empty prompt", () => {
        const agent = workerPlugin.agents!.worker;
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = workerPlugin.agents!.worker;
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
