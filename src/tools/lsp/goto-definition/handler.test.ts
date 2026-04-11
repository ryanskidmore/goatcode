import { describe, it, expect, mock } from "bun:test";
import { lspGotoDefinitionTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("lspGotoDefinitionTool", () => {
  describe("#given a mock LSP client", () => {
    describe("#when definition is found", () => {
      it("#then returns formatted result containing the location", async () => {
        const ctx = createMockToolContext({
          client: {
            lspGotoDefinition: mock(async () => ({
              data: [
                {
                  uri: "file:///src/utils.ts",
                  range: { start: { line: 10, character: 0 }, end: { line: 10, character: 8 } },
                },
              ],
            })),
          },
        } as never);

        const result = await lspGotoDefinitionTool.execute(
          { filePath: "/src/utils.ts", line: 5, character: 3 },
          ctx,
        );

        expect(result).toContain("utils.ts");
        expect(result).not.toBe("No definition found");
      });
    });

    describe("#when no definition is found", () => {
      it("#then returns 'No definition found'", async () => {
        const ctx = createMockToolContext({
          client: {
            lspGotoDefinition: mock(async () => ({ data: [] })),
          },
        } as never);

        const result = await lspGotoDefinitionTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toBe("No definition found");
      });
    });

    describe("#when the LSP client throws", () => {
      it("#then returns an error message", async () => {
        const ctx = createMockToolContext({
          client: {
            lspGotoDefinition: mock(async () => {
              throw new Error("LSP connection lost");
            }),
          },
        } as never);

        const result = await lspGotoDefinitionTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toBe("Error: LSP connection lost");
      });
    });
  });

  describe("#given invalid arguments", () => {
    describe("#when filePath is missing", () => {
      it("#then returns a validation error", async () => {
        const ctx = createMockToolContext();

        const result = await lspGotoDefinitionTool.execute({ line: 1, character: 0 }, ctx);

        expect(result).toMatch(/^Error:/);
      });
    });
  });
});

// ─── T62: LSP goto-definition rejects float line/character ───────────────────

describe("T62 — LSP goto-definition rejects float line/character", () => {
  it("goto_definition: line: 1.5 rejected", async () => {
    const { lspGotoDefinitionArgsSchema } = await import("./types");

    const result = lspGotoDefinitionArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1.5,
      character: 0,
    });

    expect(result.success).toBe(false);
  });

  it("goto_definition: character: 2.9 rejected", async () => {
    const { lspGotoDefinitionArgsSchema } = await import("./types");

    const result = lspGotoDefinitionArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1,
      character: 2.9,
    });

    expect(result.success).toBe(false);
  });

  it("integer line numbers are still accepted", async () => {
    const { lspGotoDefinitionArgsSchema } = await import("./types");

    const result = lspGotoDefinitionArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 10,
      character: 5,
    });

    expect(result.success).toBe(true);
  });
});
