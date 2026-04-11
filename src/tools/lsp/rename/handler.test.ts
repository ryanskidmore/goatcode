import { describe, it, expect, mock } from "bun:test";
import { lspRenameTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("lspRenameTool", () => {
  describe("#given a mock LSP client", () => {
    describe("#when rename produces changes", () => {
      it("#then returns formatted workspace edit", async () => {
        const ctx = createMockToolContext({
          client: {
            lspRename: mock(async () => ({
              data: {
                changes: {
                  "file:///src/foo.ts": [
                    {
                      range: { start: { line: 1, character: 4 }, end: { line: 1, character: 11 } },
                      newText: "newName",
                    },
                  ],
                },
              },
            })),
          },
        } as never);

        const result = await lspRenameTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 4, newName: "newName" },
          ctx,
        );

        expect(result).toContain("changes");
        expect(result).toContain("newName");
      });
    });

    describe("#when no rename changes are produced", () => {
      it("#then returns 'No rename changes produced'", async () => {
        const ctx = createMockToolContext({
          client: {
            lspRename: mock(async () => ({ data: null })),
          },
        } as never);

        const result = await lspRenameTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0, newName: "newName" },
          ctx,
        );

        expect(result).toBe("No rename changes produced");
      });
    });

    describe("#when the LSP client returns an error response", () => {
      it("#then returns an error message", async () => {
        const ctx = createMockToolContext({
          client: {
            lspRename: mock(async () => ({
              error: "Cannot rename: symbol is read-only",
            })),
          },
        } as never);

        const result = await lspRenameTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0, newName: "newName" },
          ctx,
        );

        expect(result).toBe("Error: Cannot rename: symbol is read-only");
      });
    });
  });

  describe("#given invalid arguments", () => {
    describe("#when newName is missing", () => {
      it("#then returns a validation error", async () => {
        const ctx = createMockToolContext();

        const result = await lspRenameTool.execute(
          { filePath: "/src/foo.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toMatch(/^Error:/);
      });
    });
  });
});

// ─── T60: lsp_rename rejects empty newName ───────────────────────────────────

describe("T60 — lsp_rename empty newName rejected", () => {
  it("rejects newName: '' with a Zod validation error", async () => {
    const { lspRenameArgsSchema } = await import("./types");

    const result = lspRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1,
      character: 0,
      newName: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("newName");
    }
  });

  it("accepts a non-empty newName", async () => {
    const { lspRenameArgsSchema } = await import("./types");

    const result = lspRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1,
      character: 0,
      newName: "myNewName",
    });

    expect(result.success).toBe(true);
  });
});

// ─── T62: LSP rename rejects float line/character numbers ────────────────────

describe("T62 — lsp_rename rejects float line/character", () => {
  it("rename: line: 3.14 rejected", async () => {
    const { lspRenameArgsSchema } = await import("./types");

    const result = lspRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 3.14,
      character: 0,
      newName: "foo",
    });

    expect(result.success).toBe(false);
  });
});
