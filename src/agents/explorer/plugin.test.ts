import { describe, it, expect } from "bun:test";
import { explorerPlugin } from "./plugin";

describe("explorerPlugin", () => {
  describe("#given the explorer plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(explorerPlugin.name).toBe("explorer");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'subagent'", () => {
        const agent = explorerPlugin.agents!.explorer;
        expect(agent.mode).toBe("subagent");
      });

      it("#then temperature is 0.1", () => {
        const agent = explorerPlugin.agents!.explorer;
        expect(agent.temperature).toBe(0.1);
      });

      it("#then has a non-empty prompt", () => {
        const agent = explorerPlugin.agents!.explorer;
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then does not define tool restrictions", () => {
        const agent = explorerPlugin.agents!.explorer;
        expect(agent.tools).toBeUndefined();
      });
    });
  });
});
