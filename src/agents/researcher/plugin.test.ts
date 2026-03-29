import { describe, it, expect } from "bun:test";
import { researcherPlugin } from "./plugin";

describe("researcherPlugin", () => {
  describe("#given the researcher plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(researcherPlugin.name).toBe("researcher");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'subagent'", () => {
        const agent = researcherPlugin.agents!.researcher;
        expect(agent.mode).toBe("subagent");
      });

      it("#then has a model, temperature, and non-empty prompt", () => {
        const agent = researcherPlugin.agents!.researcher;
        expect(typeof agent.model).toBe("string");
        expect(agent.model!.length).toBeGreaterThan(0);
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = researcherPlugin.agents!.researcher;
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
