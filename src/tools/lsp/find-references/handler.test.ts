import { describe, it, expect, mock } from "bun:test";
import { lspFindReferencesTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("lspFindReferencesTool", () => {
  describe("#given a mock LSP client", () => {
    describe("#when references are found", () => {
      it("#then returns formatted result with reference locations", async () => {
        const ctx = createMockToolContext({
          client: {
            lspFindReferences: mock(async () => ({
              data: [
                { uri: "file:///src/a.ts", range: { start: { line: 1, character: 0 } } },
                { uri: "file:///src/b.ts", range: { start: { line: 5, character: 2 } } },
              ],
            })),
          },
        } as never);

        const result = await lspFindReferencesTool.execute(
          { filePath: "/src/a.ts", line: 3, character: 5, includeDeclaration: true },
          ctx,
        );

        expect(result).toContain("a.ts");
        expect(result).toContain("b.ts");
        expect(result).not.toBe("No references found");
      });
    });

    describe("#when no references are found", () => {
      it("#then returns 'No references found'", async () => {
        const ctx = createMockToolContext({
          client: {
            lspFindReferences: mock(async () => ({ data: [] })),
          },
        } as never);

        const result = await lspFindReferencesTool.execute(
          { filePath: "/src/a.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toBe("No references found");
      });
    });

    describe("#when the LSP client returns an error response", () => {
      it("#then returns an error message", async () => {
        const ctx = createMockToolContext({
          client: {
            lspFindReferences: mock(async () => ({
              error: "Server not initialized",
            })),
          },
        } as never);

        const result = await lspFindReferencesTool.execute(
          { filePath: "/src/a.ts", line: 1, character: 0 },
          ctx,
        );

        expect(result).toBe("Error: Server not initialized");
      });
    });
  });

  describe("#given invalid arguments", () => {
    describe("#when filePath is missing", () => {
      it("#then returns a validation error", async () => {
        const ctx = createMockToolContext();

        const result = await lspFindReferencesTool.execute(
          { line: 1, character: 0 },
          ctx,
        );

        expect(result).toMatch(/^Error:/);
      });
    });
  });
});
