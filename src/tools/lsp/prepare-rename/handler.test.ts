import { describe, it, expect, mock } from "bun:test";
import { lspPrepareRenameTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("lspPrepareRenameTool", () => {
  describe("#given a mock LSP client", () => {
    describe("#when rename is valid at position", () => {
      it("#then returns formatted rename preparation result", async () => {
        const ctx = createMockToolContext({
          client: {
            lspPrepareRename: mock(async () => ({
              data: {
                range: { start: { line: 10, character: 4 }, end: { line: 10, character: 12 } },
                placeholder: "oldName",
              },
            })),
          },
        } as never);

        const result = await lspPrepareRenameTool.execute(
          { filePath: "/src/foo.ts", line: 10, character: 5 },
          ctx,
        );

        expect(result).toContain("oldName");
        expect(result).toContain("range");
      });
    });

    describe("#when rename is not valid at position", () => {
      it("#then returns 'Rename is not valid at this position'", async () => {
        const ctx = createMockToolContext({
          client: {
            lspPrepareRename: mock(async () => ({ data: null })),
          },
        } as never);

        const result = await lspPrepareRenameTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toBe("Rename is not valid at this position");
      });
    });

    describe("#when the LSP client throws", () => {
      it("#then returns an error message", async () => {
        const ctx = createMockToolContext({
          client: {
            lspPrepareRename: mock(async () => {
              throw new Error("Method not supported");
            }),
          },
        } as never);

        const result = await lspPrepareRenameTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toBe("Error: Method not supported");
      });
    });
  });

  describe("#given invalid arguments", () => {
    describe("#when line is zero", () => {
      it("#then returns a validation error for min constraint", async () => {
        const ctx = createMockToolContext();

        const result = await lspPrepareRenameTool.execute(
          { filePath: "/src/foo.ts", line: 0, character: 0 },
          ctx,
        );

        expect(result).toMatch(/^Error:/);
      });
    });
  });
});

// ─── T62: LSP prepare-rename rejects float line/character ────────────────────

describe("T62 — LSP prepare-rename rejects float line", () => {
  it("prepare_rename: line: 0.5 rejected", async () => {
    const { lspPrepareRenameArgsSchema } = await import("./types");

    const result = lspPrepareRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 0.5,
      character: 0,
    });

    expect(result.success).toBe(false);
  });
});

// ─── T64: prepare_rename returns [] → "Rename is not valid" ─────────────────

describe("T64 — lsp_prepare_rename normalises empty array to not-valid message", () => {
  it("returns 'Rename is not valid' when LSP returns empty array", async () => {
    const { lspPrepareRenameTool } = await import("./handler");
    const { createMockToolContext } = await import("../../../test-utils");

    const ctx = createMockToolContext({
      client: {
        lspPrepareRename: mock(async () => ({ data: [] })),
      },
    } as never);

    const result = await lspPrepareRenameTool.execute(
      { filePath: "/src/foo.ts", line: 1, character: 0 },
      ctx,
    );

    expect(result).toBe("Rename is not valid at this position");
    expect(result).not.toBe("[]");
  });
});
