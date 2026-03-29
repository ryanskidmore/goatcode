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
