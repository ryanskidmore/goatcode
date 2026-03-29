import { describe, it, expect } from "bun:test";
import { planBuilderPlugin } from "./plugin";

describe("planBuilderPlugin", () => {
  describe("#given the plan-builder plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(planBuilderPlugin.name).toBe("plan-builder");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'subagent'", () => {
        const agent = planBuilderPlugin.agents!["plan-builder"];
        expect(agent.mode).toBe("subagent");
      });

      it("#then has a model, temperature, and non-empty prompt", () => {
        const agent = planBuilderPlugin.agents!["plan-builder"];
        expect(typeof agent.model).toBe("string");
        expect(agent.model!.length).toBeGreaterThan(0);
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = planBuilderPlugin.agents!["plan-builder"];
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
