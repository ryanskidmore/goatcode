import { describe, it, expect, mock, afterEach } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";

import { lspGotoDefinitionPlugin } from "./goto-definition/plugin";
import { lspFindReferencesPlugin } from "./find-references/plugin";
import { lspSymbolsPlugin } from "./symbols/plugin";
import { lspDiagnosticsPlugin } from "./diagnostics/plugin";
import { lspPrepareRenamePlugin } from "./prepare-rename/plugin";
import { lspRenamePlugin } from "./rename/plugin";
import { initLspClientContext, resetLspClientContext } from "./client";
import type { OpenCodeContext } from "../../types/plugin";

type ToolContext = Parameters<ToolDefinition["execute"]>[1];

function createToolContext(result: unknown) {
  const call = mock(async () => ({ data: result }));
  const context = {
    client: {
      tool: { call },
    },
  } as unknown as ToolContext;
  return { call, context };
}

describe("lsp client stored fallback", () => {
  afterEach(() => {
    resetLspClientContext();
  });

  describe("#given tool context does NOT expose client", () => {
    describe("#when stored client is initialized", () => {
      it("#then uses stored client as fallback", async () => {
        const call = mock(async () => ({ data: [{ filePath: "fallback.ts", line: 1 }] }));
        const mockCtx = {
          client: { tool: { call } },
          directory: "/repo",
        } as unknown as OpenCodeContext;
        initLspClientContext(mockCtx);

        const tool = lspGotoDefinitionPlugin.tools!.lsp_goto_definition;
        // Context WITHOUT client - should fall back to stored
        const contextWithoutClient = { directory: "/repo" } as unknown as ToolContext;

        const result = await tool.execute(
          { filePath: "a.ts", line: 1, character: 0 },
          contextWithoutClient,
        );

        expect(call).toHaveBeenCalledTimes(1);
        expect(result).toContain("fallback.ts");
      });
    });

    describe("#when stored client is NOT initialized", () => {
      it("#then returns error message", async () => {
        resetLspClientContext();
        const tool = lspGotoDefinitionPlugin.tools!.lsp_goto_definition;
        const contextWithoutClient = { directory: "/repo" } as unknown as ToolContext;

        const result = await tool.execute(
          { filePath: "a.ts", line: 1, character: 0 },
          contextWithoutClient,
        );

        expect(result).toContain("Tool context does not expose OpenCode client");
      });
    });
  });
});

describe("lsp tool plugins", () => {
  describe("#given lsp_goto_definition plugin", () => {
    describe("#when tool executes through client proxy", () => {
      it("#then it calls client.tool.call with lsp_goto_definition", async () => {
        const tool = lspGotoDefinitionPlugin.tools!.lsp_goto_definition;
        const { call, context } = createToolContext([{ filePath: "a.ts", line: 7 }]);

        const result = await tool.execute({ filePath: "a.ts", line: 1, character: 0 }, context);

        expect(call).toHaveBeenCalledTimes(1);
        expect(call.mock.calls[0]?.[0]).toEqual({
          name: "lsp_goto_definition",
          arguments: { filePath: "a.ts", line: 1, character: 0 },
        });
        expect(result).toContain("a.ts");
      });
    });
  });

  describe("#given lsp_find_references plugin", () => {
    describe("#when tool executes through client proxy", () => {
      it("#then it calls client.tool.call with lsp_find_references", async () => {
        const tool = lspFindReferencesPlugin.tools!.lsp_find_references;
        const { call, context } = createToolContext([{ filePath: "a.ts", line: 9 }]);

        const result = await tool.execute(
          { filePath: "a.ts", line: 2, character: 3, includeDeclaration: true },
          context,
        );

        expect(call).toHaveBeenCalledTimes(1);
        expect(call.mock.calls[0]?.[0]).toEqual({
          name: "lsp_find_references",
          arguments: { filePath: "a.ts", line: 2, character: 3, includeDeclaration: true },
        });
        expect(result).toContain("a.ts");
      });
    });
  });

  describe("#given lsp_symbols plugin", () => {
    describe("#when workspace scope omits query", () => {
      it("#then it returns a validation message", async () => {
        const tool = lspSymbolsPlugin.tools!.lsp_symbols;
        const { context } = createToolContext([]);

        const result = await tool.execute({ filePath: "a.ts", scope: "workspace" }, context);

        expect(result).toBe("Error: 'query' is required for workspace scope");
      });
    });

    describe("#when document scope executes through client proxy", () => {
      it("#then it calls client.tool.call with lsp_symbols", async () => {
        const tool = lspSymbolsPlugin.tools!.lsp_symbols;
        const { call, context } = createToolContext([{ name: "myFunc" }]);

        const result = await tool.execute(
          { filePath: "a.ts", scope: "document", limit: 10 },
          context,
        );

        expect(call.mock.calls[0]?.[0]).toEqual({
          name: "lsp_symbols",
          arguments: { filePath: "a.ts", scope: "document", limit: 10 },
        });
        expect(result).toContain("myFunc");
      });
    });
  });

  describe("#given lsp_diagnostics plugin", () => {
    describe("#when directory-level args are provided", () => {
      it("#then it forwards extension and severity to client", async () => {
        const tool = lspDiagnosticsPlugin.tools!.lsp_diagnostics;
        const { call, context } = createToolContext([{ severity: "warning" }]);

        const result = await tool.execute(
          { filePath: "src", extension: ".ts", severity: "warning" },
          context,
        );

        expect(call.mock.calls[0]?.[0]).toEqual({
          name: "lsp_diagnostics",
          arguments: { filePath: "src", extension: ".ts", severity: "warning" },
        });
        expect(result).toContain("warning");
      });
    });
  });

  describe("#given lsp_prepare_rename plugin", () => {
    describe("#when tool executes through client proxy", () => {
      it("#then it calls client.tool.call with lsp_prepare_rename", async () => {
        const tool = lspPrepareRenamePlugin.tools!.lsp_prepare_rename;
        const { call, context } = createToolContext({ range: { start: 1, end: 2 } });

        const result = await tool.execute({ filePath: "a.ts", line: 10, character: 5 }, context);

        expect(call.mock.calls[0]?.[0]).toEqual({
          name: "lsp_prepare_rename",
          arguments: { filePath: "a.ts", line: 10, character: 5 },
        });
        expect(result).toContain("range");
      });
    });
  });

  describe("#given lsp_rename plugin", () => {
    describe("#when tool executes through client proxy", () => {
      it("#then it calls client.tool.call with lsp_rename", async () => {
        const tool = lspRenamePlugin.tools!.lsp_rename;
        const { call, context } = createToolContext({ changes: { "a.ts": [] } });

        const result = await tool.execute(
          { filePath: "a.ts", line: 12, character: 1, newName: "nextName" },
          context,
        );

        expect(call.mock.calls[0]?.[0]).toEqual({
          name: "lsp_rename",
          arguments: { filePath: "a.ts", line: 12, character: 1, newName: "nextName" },
        });
        expect(result).toContain("changes");
      });
    });
  });
});
