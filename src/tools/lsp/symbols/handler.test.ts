import { describe, it, expect, mock } from "bun:test";
import { lspSymbolsTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("lspSymbolsTool", () => {
  describe("#given a mock LSP client with document scope", () => {
    describe("#when symbols are found", () => {
      it("#then returns formatted symbol list", async () => {
        const ctx = createMockToolContext({
          client: {
            lspSymbols: mock(async () => ({
              data: [
                { name: "MyClass", kind: 5 },
                { name: "myFunction", kind: 12 },
              ],
            })),
          },
        } as never);

        const result = await lspSymbolsTool.execute(
          { filePath: "/src/foo.ts", scope: "document" },
          ctx,
        );

        expect(result).toContain("MyClass");
        expect(result).toContain("myFunction");
      });
    });

    describe("#when no symbols are found", () => {
      it("#then returns 'No symbols found'", async () => {
        const ctx = createMockToolContext({
          client: {
            lspSymbols: mock(async () => ({ data: [] })),
          },
        } as never);

        const result = await lspSymbolsTool.execute(
          { filePath: "/src/empty.ts", scope: "document" },
          ctx,
        );

        expect(result).toBe("No symbols found");
      });
    });
  });

  describe("#given workspace scope", () => {
    describe("#when query is omitted", () => {
      it("#then returns an error about missing query", async () => {
        const ctx = createMockToolContext({
          client: {
            lspSymbols: mock(async () => ({ data: [] })),
          },
        } as never);

        const result = await lspSymbolsTool.execute(
          { filePath: "/src/foo.ts", scope: "workspace" },
          ctx,
        );

        expect(result).toBe("Error: 'query' is required for workspace scope");
      });
    });

    describe("#when query is provided", () => {
      it("#then returns formatted results", async () => {
        const ctx = createMockToolContext({
          client: {
            lspSymbols: mock(async () => ({
              data: [
                { name: "handleRequest", kind: 12, location: { uri: "file:///src/server.ts" } },
              ],
            })),
          },
        } as never);

        const result = await lspSymbolsTool.execute(
          { filePath: "/src/server.ts", scope: "workspace", query: "handleRequest" },
          ctx,
        );

        expect(result).toContain("handleRequest");
      });
    });
  });

  describe("#given the LSP client throws", () => {
    describe("#when an unexpected error occurs", () => {
      it("#then returns an error message", async () => {
        const ctx = createMockToolContext({
          client: {
            lspSymbols: mock(async () => {
              throw new Error("Timeout waiting for response");
            }),
          },
        } as never);

        const result = await lspSymbolsTool.execute(
          { filePath: "/src/foo.ts", scope: "document" },
          ctx,
        );

        expect(result).toBe("Error: Timeout waiting for response");
      });
    });
  });
});
