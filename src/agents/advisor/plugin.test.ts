import { describe, it, expect } from "bun:test";
import { advisorPlugin } from "./plugin";
import { buildToolsMap } from "../tool-restrictions";

describe("advisorPlugin", () => {
  describe("#given the advisor plugin", () => {
    describe("#when inspecting plugin metadata", () => {
      it("#then has the correct plugin name", () => {
        expect(advisorPlugin.name).toBe("advisor");
      });
    });

    describe("#when inspecting the agent config", () => {
      it("#then mode is 'subagent'", () => {
        const agent = advisorPlugin.agents!.advisor;
        expect(agent.mode).toBe("subagent");
      });

      it("#then has a model, temperature, and non-empty prompt", () => {
        const agent = advisorPlugin.agents!.advisor;
        expect(typeof agent.model).toBe("string");
        expect(agent.model!.length).toBeGreaterThan(0);
        expect(typeof agent.temperature).toBe("number");
        expect(typeof agent.prompt).toBe("string");
        expect(agent.prompt!.length).toBeGreaterThan(0);
      });
    });

    describe("#when inspecting tool restrictions", () => {
      it("#then buildToolsMap('advisor') denies write, edit, bash, and task tools", () => {
        const tools = buildToolsMap("advisor");
        expect(tools).toBeDefined();
        expect(tools!["write"]).toBe(false);
        expect(tools!["edit"]).toBe(false);
        expect(tools!["bash"]).toBe(false);
        expect(tools!["interactive_bash"]).toBe(false);
        expect(tools!["delegate_task"]).toBe(false);
        expect(tools!["task_create"]).toBe(false);
        expect(tools!["task_update"]).toBe(false);
      });

      it("#then the agent config includes the tools map", () => {
        const agent = advisorPlugin.agents!.advisor;
        expect(agent.tools).toBeDefined();
        expect(agent.tools!["write"]).toBe(false);
        expect(agent.tools!["edit"]).toBe(false);
      });
    });
  });
});
