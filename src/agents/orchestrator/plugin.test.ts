import { describe, it, expect } from "bun:test";
import { orchestratorPlugin } from "./plugin";

describe("orchestratorPlugin", () => {
  describe("#given the orchestrator plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(orchestratorPlugin.name).toBe("orchestrator");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'primary'", () => {
        const agent = orchestratorPlugin.agents!.orchestrator;
        expect(agent.mode).toBe("primary");
      });

      it("#then has a model, temperature, and non-empty prompt", () => {
        const agent = orchestratorPlugin.agents!.orchestrator;
        expect(typeof agent.model).toBe("string");
        expect(agent.model!.length).toBeGreaterThan(0);
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = orchestratorPlugin.agents!.orchestrator;
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
