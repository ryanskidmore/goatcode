import { describe, it, expect, mock } from "bun:test";
import { callLspClient } from "./client";

function makeMockClient(methodName: string, returnValue: unknown) {
  return {
    [methodName]: mock(async () => returnValue),
  } as unknown as Parameters<typeof callLspClient>[0];
}

describe("callLspClient / unwrapClientResponse", () => {
  describe("#given a client response with a truthy error", () => {
    describe("#when error is a non-empty string", () => {
      it("#then throws with the error message", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          error: "symbol not found",
          data: null,
        });

        await expect(
          callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
            filePath: "/src/foo.ts",
            line: 1,
            character: 0,
          }),
        ).rejects.toThrow("symbol not found");
      });
    });

    describe("#when error is a non-zero number", () => {
      it("#then throws", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          error: 42,
          data: null,
        });

        await expect(
          callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
            filePath: "/src/foo.ts",
            line: 1,
            character: 0,
          }),
        ).rejects.toThrow("42");
      });
    });
  });

  describe("#given a client response with a falsy error value", () => {
    describe("#when error is 0 (API convention for no-error)", () => {
      it("#then does not throw and returns data", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          error: 0,
          data: [{ uri: "file:///src/utils.ts" }],
        });

        const result = await callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
          filePath: "/src/foo.ts",
          line: 1,
          character: 0,
        });

        expect(result).toEqual([{ uri: "file:///src/utils.ts" }]);
      });
    });

    describe("#when error is false", () => {
      it("#then does not throw and returns data", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          error: false,
          data: "ok",
        });

        const result = await callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
          filePath: "/src/foo.ts",
          line: 1,
          character: 0,
        });

        expect(result).toBe("ok");
      });
    });

    describe("#when error is empty string", () => {
      it("#then does not throw and returns data", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          error: "",
          data: "result",
        });

        const result = await callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
          filePath: "/src/foo.ts",
          line: 1,
          character: 0,
        });

        expect(result).toBe("result");
      });
    });

    describe("#when error is null", () => {
      it("#then does not throw and returns data", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          error: null,
          data: "result",
        });

        const result = await callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
          filePath: "/src/foo.ts",
          line: 1,
          character: 0,
        });

        expect(result).toBe("result");
      });
    });

    describe("#when error is undefined", () => {
      it("#then does not throw and returns data", async () => {
        const client = makeMockClient("lspGotoDefinition", {
          data: "result",
        });

        const result = await callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
          filePath: "/src/foo.ts",
          line: 1,
          character: 0,
        });

        expect(result).toBe("result");
      });
    });
  });
});
