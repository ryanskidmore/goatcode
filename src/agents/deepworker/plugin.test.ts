import { describe, it, expect } from "bun:test";
import { deepWorkerPlugin } from "./plugin";

describe("deepWorkerPlugin", () => {
  describe("#given the deepworker plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(deepWorkerPlugin.name).toBe("deepworker");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'all'", () => {
        const agent = deepWorkerPlugin.agents!["deepworker"];
        expect(agent.mode).toBe("all");
      });

      it("#then has a temperature and non-empty prompt", () => {
        const agent = deepWorkerPlugin.agents!["deepworker"];
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = deepWorkerPlugin.agents!["deepworker"];
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
