import { describe, it, expect } from "bun:test";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";
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
        expect(agent.temperature).toBe(DEFAULT_TEMPERATURE);
      });

      it("#then has a non-empty prompt", () => {
        const agent = explorerPlugin.agents!.explorer;
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });

      it("#then denies delegation and mutation tools", () => {
        const agent = explorerPlugin.agents!.explorer;
        expect(agent.tools).toBeDefined();
        expect(agent.tools!.delegate_task).toBe(false);
        expect(agent.tools!.background_output).toBe(false);
        expect(agent.tools!.background_cancel).toBe(false);
        expect(agent.tools!.write).toBe(false);
        expect(agent.tools!.edit).toBe(false);
        expect(agent.tools!.bash).toBe(false);
      });
    });
  });
});
