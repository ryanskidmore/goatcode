import { describe, it, expect } from "bun:test";
import { orchestratorPlugin } from "./orchestrator/plugin";
import { deepWorkerPlugin } from "./deep-worker/plugin";
import { plannerPlugin } from "./planner/plugin";
import { advisorPlugin } from "./advisor/plugin";
import { researcherPlugin } from "./researcher/plugin";
import { explorerPlugin } from "./explorer/plugin";
import { workerPlugin } from "./worker/plugin";
import { BUILTIN_AGENT_PLUGINS } from "./builtin-agents";

const ALL_PLUGINS = [
  orchestratorPlugin,
  deepWorkerPlugin,
  plannerPlugin,
  advisorPlugin,
  researcherPlugin,
  explorerPlugin,
  workerPlugin,
];

describe("agent plugins", () => {
  describe("#given all builtin agent plugins", () => {
    describe("#when inspecting each plugin", () => {
      it("#then each has a unique name", () => {
        const names = ALL_PLUGINS.map((p) => p.name);
        expect(new Set(names).size).toBe(ALL_PLUGINS.length);
      });

      it("#then each contributes exactly one agent", () => {
        for (const plugin of ALL_PLUGINS) {
          expect(plugin.agents).toBeDefined();
          expect(Object.keys(plugin.agents!).length).toBe(1);
        }
      });

      it("#then each agent has a non-empty prompt", () => {
        for (const plugin of ALL_PLUGINS) {
          const agent = Object.values(plugin.agents!)[0];
          expect(typeof agent.prompt).toBe("string");
          expect(agent.prompt!.length).toBeGreaterThan(50);
        }
      });

      it("#then each agent has a default model configured", () => {
        for (const plugin of ALL_PLUGINS) {
          const agent = Object.values(plugin.agents!)[0];
          expect(typeof agent.model).toBe("string");
          expect(agent.model!.length).toBeGreaterThan(0);
        }
      });

      it("#then each agent has a temperature number", () => {
        for (const plugin of ALL_PLUGINS) {
          const agent = Object.values(plugin.agents!)[0];
          expect(typeof agent.temperature).toBe("number");
        }
      });

      it("#then each plugin has version 0.1.0", () => {
        for (const plugin of ALL_PLUGINS) {
          expect(plugin.version).toBe("0.1.0");
        }
      });

      it("#then the agent key matches the plugin name", () => {
        for (const plugin of ALL_PLUGINS) {
          const agentKeys = Object.keys(plugin.agents!);
          expect(agentKeys[0]).toBe(plugin.name);
        }
      });
    });

    describe("#when checking tool-restricted agents", () => {
      it("#then advisor has write, edit, bash, and task tools denied", () => {
        const agent = advisorPlugin.agents!["advisor"];
        expect(agent.tools).toBeDefined();
        expect(agent.tools!["write"]).toBe(false);
        expect(agent.tools!["edit"]).toBe(false);
        expect(agent.tools!["bash"]).toBe(false);
        expect(agent.tools!["interactive_bash"]).toBe(false);
        expect(agent.tools!["delegate_task"]).toBe(false);
        expect(agent.tools!["task_create"]).toBe(false);
        expect(agent.tools!["task_update"]).toBe(false);
      });
    });

    describe("#when checking BUILTIN_AGENT_PLUGINS barrel", () => {
      it("#then it contains exactly 7 plugins", () => {
        expect(BUILTIN_AGENT_PLUGINS).toHaveLength(7);
      });

      it("#then it matches the individual plugin imports", () => {
        for (const plugin of ALL_PLUGINS) {
          expect(BUILTIN_AGENT_PLUGINS).toContain(plugin);
        }
      });
    });
  });
});
