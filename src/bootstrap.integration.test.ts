import { afterEach, describe, expect, it, mock } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  "session_info",
] as const;

const EXPECTED_AGENT_NAMES = [
  "orchestrator",
  "deepworker",
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
        const configuredAgentNames = Object.keys(configuredAgents);
        const allowedExtraAgents = new Set(["build", "plan"]);
        const unexpectedAgents = configuredAgentNames.filter(
          (name) =>
            !EXPECTED_AGENT_NAMES.includes(name as (typeof EXPECTED_AGENT_NAMES)[number]) &&
            !allowedExtraAgents.has(name),
        );
        expect(unexpectedAgents).toEqual([]);
        expect(configuredAgentNames.length).toBeGreaterThanOrEqual(EXPECTED_AGENT_NAMES.length);
      });

      it("#then resolves agent models using connected providers from disk cache", async () => {
        // Write a mock connected-providers cache so the config hook can resolve models.
        const previousXdgCacheHome = process.env.XDG_CACHE_HOME;
        const tempCacheHome = await mkdtemp(join(tmpdir(), "goatcode-bootstrap-cache-"));
        process.env.XDG_CACHE_HOME = tempCacheHome;
        const { writeConnectedProviders, resetConnectedProvidersCache } =
          await import("./shared/connected-providers-cache");
        writeConnectedProviders(["opencode"]);

        try {
          globalThis.structuredClone = passthroughStructuredClone;
          const hooks = await bootstrap(createBootstrapContext());
          expect(hooks.config).toBeDefined();

          if (!hooks.config) {
            throw new Error("Expected hooks.config to be defined");
          }

          type ConfigInput = Parameters<NonNullable<typeof hooks.config>>[0];
          const input = { agent: {} } as ConfigInput;

          await hooks.config(input);

          // With only "opencode" connected, all models should use the opencode provider.
          expect(input.agent?.orchestrator?.model).toBe("opencode/claude-opus-4-6");
          expect(input.agent?.worker?.model).toBe("opencode/claude-sonnet-4-6");
        } finally {
          if (previousXdgCacheHome === undefined) {
            delete process.env.XDG_CACHE_HOME;
          } else {
            process.env.XDG_CACHE_HOME = previousXdgCacheHome;
          }
          resetConnectedProvidersCache();
          await rm(tempCacheHome, { recursive: true, force: true });
        }
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

describe("bootstrap — agent fallback_models override (A22)", () => {
  afterEach(() => {
    loadConfigImpl = async () => undefined;
    globalThis.structuredClone = originalStructuredClone;
  });

  describe("#given agents.orchestrator.fallback_models overrides with a qualified openai model", () => {
    describe("#when bootstrap runs with openai as the only connected provider", () => {
      it("#then orchestrator is assigned the custom model (no default-chain variant)", async () => {
        const previousXdgCacheHome = process.env.XDG_CACHE_HOME;
        const tempCacheHome = await mkdtemp(
          join(tmpdir(), "goatcode-bootstrap-fallback-override-"),
        );
        process.env.XDG_CACHE_HOME = tempCacheHome;
        const { writeConnectedProviders, resetConnectedProvidersCache } =
          await import("./shared/connected-providers-cache");
        writeConnectedProviders(["openai"]);

        loadConfigImpl = async () => ({
          agents: {
            orchestrator: {
              // Custom chain: openai/gpt-5.4 only, no variant (default chain would add variant:medium)
              fallback_models: ["openai/gpt-5.4"],
            },
          },
        });
        globalThis.structuredClone = passthroughStructuredClone;

        try {
          const hooks = await bootstrap(createBootstrapContext());
          expect(hooks.config).toBeDefined();

          type ConfigInput = Parameters<NonNullable<typeof hooks.config>>[0];
          const input = { agent: {} } as ConfigInput;
          expect(hooks.config).toBeDefined();
          if (!hooks.config) throw new Error("Expected hooks.config to be defined");
          await hooks.config(input);

          // openai is connected → custom chain [openai/gpt-5.4] resolves to openai/gpt-5.4.
          // The default chain entry also resolves to openai/gpt-5.4 with variant:medium, but
          // the custom chain entry has no variant, so the resolved variant should be undefined.
          expect(input.agent?.orchestrator?.model).toBe("openai/gpt-5.4");
          expect(input.agent?.orchestrator?.["variant"]).toBeUndefined();
        } finally {
          if (previousXdgCacheHome === undefined) {
            delete process.env.XDG_CACHE_HOME;
          } else {
            process.env.XDG_CACHE_HOME = previousXdgCacheHome;
          }
          resetConnectedProvidersCache();
          await rm(tempCacheHome, { recursive: true, force: true });
        }
      });
    });
  });

  describe("#given agents.orchestrator.fallback_models is a single unqualified model string", () => {
    describe("#when bootstrap runs with opencode as the only connected provider", () => {
      it("#then orchestrator is assigned opencode/<custom-model> via the opencode universal fallback", async () => {
        const previousXdgCacheHome = process.env.XDG_CACHE_HOME;
        const tempCacheHome = await mkdtemp(
          join(tmpdir(), "goatcode-bootstrap-fallback-unqualified-"),
        );
        process.env.XDG_CACHE_HOME = tempCacheHome;
        const { writeConnectedProviders, resetConnectedProvidersCache } =
          await import("./shared/connected-providers-cache");
        writeConnectedProviders(["opencode"]);

        loadConfigImpl = async () => ({
          agents: {
            orchestrator: {
              fallback_models: "my-custom-model",
            },
          },
        });
        globalThis.structuredClone = passthroughStructuredClone;

        try {
          const hooks = await bootstrap(createBootstrapContext());

          type ConfigInput = Parameters<NonNullable<typeof hooks.config>>[0];
          const input = { agent: {} } as ConfigInput;
          expect(hooks.config).toBeDefined();
          if (!hooks.config) throw new Error("Expected hooks.config to be defined");
          await hooks.config(input);

          // Unqualified → providers:["opencode"]; opencode is connected → resolves to opencode/my-custom-model.
          expect(input.agent?.orchestrator?.model).toBe("opencode/my-custom-model");
        } finally {
          if (previousXdgCacheHome === undefined) {
            delete process.env.XDG_CACHE_HOME;
          } else {
            process.env.XDG_CACHE_HOME = previousXdgCacheHome;
          }
          resetConnectedProvidersCache();
          await rm(tempCacheHome, { recursive: true, force: true });
        }
      });
    });
  });
});

describe("bootstrap — subagent model resolution independence (A7)", () => {
  afterEach(() => {
    loadConfigImpl = async () => undefined;
    globalThis.structuredClone = originalStructuredClone;
  });

  describe("#given anthropic as the only connected provider", () => {
    describe("#when bootstrap runs and config hook fires", () => {
      it("#then subagent agents resolve models from their own fallback chain to anthropic-backed models", async () => {
        const previousXdgCacheHome = process.env.XDG_CACHE_HOME;
        const tempCacheHome = await mkdtemp(join(tmpdir(), "goatcode-bootstrap-subagent-mode-"));
        process.env.XDG_CACHE_HOME = tempCacheHome;
        const { writeConnectedProviders, resetConnectedProvidersCache } =
          await import("./shared/connected-providers-cache");
        writeConnectedProviders(["anthropic"]);

        try {
          globalThis.structuredClone = passthroughStructuredClone;
          const hooks = await bootstrap(createBootstrapContext());
          expect(hooks.config).toBeDefined();

          if (!hooks.config) {
            throw new Error("Expected hooks.config to be defined");
          }

          type ConfigInput = Parameters<NonNullable<typeof hooks.config>>[0];
          const input = { agent: {} } as ConfigInput;
          await hooks.config(input);

          // All three subagent-mode agents must resolve to anthropic-backed models,
          // confirming their model resolution path is independent of UI model selection.
          expect(input.agent?.advisor?.model).toBeDefined();
          expect(typeof input.agent?.advisor?.model).toBe("string");
          expect(input.agent?.advisor?.model).toMatch(/^anthropic\//);

          expect(input.agent?.explorer?.model).toBeDefined();
          expect(typeof input.agent?.explorer?.model).toBe("string");
          expect(input.agent?.explorer?.model).toMatch(/^anthropic\//);

          expect(input.agent?.worker?.model).toBeDefined();
          expect(typeof input.agent?.worker?.model).toBe("string");
          expect(input.agent?.worker?.model).toMatch(/^anthropic\//);
        } finally {
          if (previousXdgCacheHome === undefined) {
            delete process.env.XDG_CACHE_HOME;
          } else {
            process.env.XDG_CACHE_HOME = previousXdgCacheHome;
          }
          resetConnectedProvidersCache();
          await rm(tempCacheHome, { recursive: true, force: true });
        }
      });

      it("#then all-mode agents also resolve to anthropic-backed models from their own chains", async () => {
        const previousXdgCacheHome = process.env.XDG_CACHE_HOME;
        const tempCacheHome = await mkdtemp(
          join(tmpdir(), "goatcode-bootstrap-allmode-anthropic-"),
        );
        process.env.XDG_CACHE_HOME = tempCacheHome;
        const { writeConnectedProviders, resetConnectedProvidersCache } =
          await import("./shared/connected-providers-cache");
        writeConnectedProviders(["anthropic"]);

        try {
          globalThis.structuredClone = passthroughStructuredClone;
          const hooks = await bootstrap(createBootstrapContext());
          expect(hooks.config).toBeDefined();

          if (!hooks.config) {
            throw new Error("Expected hooks.config to be defined");
          }

          type ConfigInput = Parameters<NonNullable<typeof hooks.config>>[0];
          const input = { agent: {} } as ConfigInput;
          await hooks.config(input);

          // Orchestrator and planner have claude-opus-4-6 in their chains → anthropic-backed.
          expect(input.agent?.orchestrator?.model).toMatch(/^anthropic\//);
          expect(input.agent?.planner?.model).toMatch(/^anthropic\//);
        } finally {
          if (previousXdgCacheHome === undefined) {
            delete process.env.XDG_CACHE_HOME;
          } else {
            process.env.XDG_CACHE_HOME = previousXdgCacheHome;
          }
          resetConnectedProvidersCache();
          await rm(tempCacheHome, { recursive: true, force: true });
        }
      });
    });
  });
});
