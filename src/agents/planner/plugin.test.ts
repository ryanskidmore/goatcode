import { describe, it, expect } from "bun:test";
import { plannerPlugin } from "./plugin";

describe("plannerPlugin", () => {
  describe("#given the planner plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(plannerPlugin.name).toBe("planner");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'all'", () => {
        const agent = plannerPlugin.agents!["planner"];
        expect(agent.mode).toBe("all");
      });

      it("#then has a temperature and non-empty prompt", () => {
        const agent = plannerPlugin.agents!["planner"];
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = plannerPlugin.agents!["planner"];
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
