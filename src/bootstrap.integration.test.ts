import { afterEach, describe, expect, it, mock } from "bun:test";

const BOOTSTRAP_TEST_DIRECTORY = "/tmp/bootstrap-integration-test-project";

let loadConfigImpl: (projectDir: string) => Promise<unknown> = async () => undefined;
let realLoadConfig: ((projectDir: string) => Promise<unknown>) | null = null;
const originalStructuredClone = globalThis.structuredClone;

const passthroughStructuredClone = ((value: unknown) => value) as typeof structuredClone;

mock.module("./config/loader", () => ({
  loadConfig: (projectDir: string) => {
    if (projectDir === BOOTSTRAP_TEST_DIRECTORY) {
      return loadConfigImpl(projectDir);
    }
    if (!realLoadConfig) {
      throw new Error("real loadConfig is not initialized");
    }
    return realLoadConfig(projectDir);
  },
}));

import { bootstrap } from "./bootstrap";
import { createMockPluginContext } from "./test-utils/mock-plugin-context";

const unmockedLoaderModule = (await import(`./config/loader.ts?unmocked=${Date.now()}`)) as {
  loadConfig: (projectDir: string) => Promise<unknown>;
};
realLoadConfig = unmockedLoaderModule.loadConfig;

function createBootstrapContext() {
  return createMockPluginContext({ directory: BOOTSTRAP_TEST_DIRECTORY });
}

const EXPECTED_TOOL_NAMES = [
  "grep",
  "glob",
  "hashline_edit",
  "look_at",
  "skill",
  "task",
  "lsp_goto_definition",
  "lsp_find_references",
  "lsp_symbols",
  "lsp_diagnostics",
  "lsp_prepare_rename",
  "lsp_rename",
  "ast_grep_search",
  "ast_grep_replace",
  "background_output",
  "background_cancel",
  "session_list",
  "session_read",
  "session_search",
  "session_info",
  "task_create",
  "task_list",
  "task_get",
  "task_update",
] as const;

const EXPECTED_AGENT_NAMES = [
  "orchestrator",
  "deep-worker",
  "planner",
  "advisor",
  "researcher",
  "explorer",
  "worker",
] as const;

describe("bootstrap", () => {
  afterEach(() => {
    loadConfigImpl = async () => undefined;
    globalThis.structuredClone = originalStructuredClone;
  });

  describe("#given default config", () => {
    describe("#when bootstrap is executed", () => {
      it("#then registers all built-in GoatCode tools in hooks.tool", async () => {
        globalThis.structuredClone = passthroughStructuredClone;
        const hooks = await bootstrap(createBootstrapContext());

        expect(hooks.tool).toBeDefined();
        for (const name of EXPECTED_TOOL_NAMES) {
          expect(hooks.tool?.[name]).toBeDefined();
        }
      });

      it("#then registers all built-in GoatCode agents through the config hook", async () => {
        globalThis.structuredClone = passthroughStructuredClone;
        const hooks = await bootstrap(createBootstrapContext());
        expect(hooks.config).toBeDefined();

        if (!hooks.config) {
          throw new Error("Expected hooks.config to be defined");
        }

        type ConfigInput = Parameters<NonNullable<typeof hooks.config>>[0];
        const input = { agent: {} } as ConfigInput;

        await hooks.config(input);

        const configuredAgents = input.agent ?? {};
        for (const name of EXPECTED_AGENT_NAMES) {
          expect(configuredAgents[name]).toBeDefined();
        }
        expect(Object.keys(configuredAgents).length).toBeGreaterThanOrEqual(
          EXPECTED_AGENT_NAMES.length,
        );
      });

      it("#then exposes key hook event slots as callable functions", async () => {
        globalThis.structuredClone = passthroughStructuredClone;
        const hooks = await bootstrap(createBootstrapContext());

        expect(typeof hooks["tool.execute.before"]).toBe("function");
        expect(typeof hooks["tool.execute.after"]).toBe("function");
        expect(typeof hooks["chat.params"]).toBe("function");
        expect(typeof hooks["tool.definition"]).toBe("function");
      });
    });
  });

  describe("#given invalid raw config from loader", () => {
    describe("#when bootstrap is executed", () => {
      it("#then falls back to defaults, returns hooks, and warns to stderr", async () => {
        loadConfigImpl = async () => ({ agents: "invalid" });
        globalThis.structuredClone = passthroughStructuredClone;

        const originalStderrWrite = process.stderr.write;
        const stderrWriteSpy = mock((..._args: unknown[]) => true);
        process.stderr.write = stderrWriteSpy as typeof process.stderr.write;

        try {
          const hooks = await bootstrap(createBootstrapContext());

          expect(hooks.tool).toBeDefined();
          expect(hooks.tool?.grep).toBeDefined();
          expect(stderrWriteSpy).toHaveBeenCalled();
          expect(stderrWriteSpy.mock.calls[0]?.[0]).toContain("validation errors");
        } finally {
          process.stderr.write = originalStderrWrite;
        }
      });
    });
  });

  describe("#given disabled_tools config", () => {
    describe("#when bootstrap is executed", () => {
      it("#then excludes disabled tools from hooks.tool", async () => {
        loadConfigImpl = async () => ({ disabled_tools: ["grep"] });
        globalThis.structuredClone = passthroughStructuredClone;

        const hooks = await bootstrap(createBootstrapContext());

        expect(hooks.tool?.grep).toBeUndefined();
        expect(hooks.tool?.glob).toBeDefined();
      });
    });
  });
});
