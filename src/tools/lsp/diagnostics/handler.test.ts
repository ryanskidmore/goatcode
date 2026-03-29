import { describe, it, expect, mock } from "bun:test";
import { lspDiagnosticsTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("lspDiagnosticsTool", () => {
  describe("#given a mock LSP client", () => {
    describe("#when diagnostics are found", () => {
      it("#then returns formatted diagnostics including severity", async () => {
        const ctx = createMockToolContext({
          client: {
            lspDiagnostics: mock(async () => ({
              data: [
                {
                  severity: "error",
                  message: "Type 'string' is not assignable to type 'number'",
                  range: { start: { line: 5, character: 0 } },
                },
              ],
            })),
          },
        } as never);

        const result = await lspDiagnosticsTool.execute(
          { filePath: "/src/index.ts", severity: "error" },
          ctx,
        );

        expect(result).toContain("error");
        expect(result).toContain("not assignable");
      });
    });

    describe("#when no diagnostics are found", () => {
      it("#then returns 'No diagnostics found'", async () => {
        const ctx = createMockToolContext({
          client: {
            lspDiagnostics: mock(async () => ({ data: [] })),
          },
        } as never);

        const result = await lspDiagnosticsTool.execute({ filePath: "/src/clean.ts" }, ctx);

        expect(result).toBe("No diagnostics found");
      });
    });

    describe("#when directory with extension is queried", () => {
      it("#then forwards extension to the LSP client", async () => {
        const mockFn = mock(async () => ({
          data: [{ severity: "warning", message: "Unused variable" }],
        }));
        const ctx = createMockToolContext({
          client: { lspDiagnostics: mockFn },
        } as never);

        const result = await lspDiagnosticsTool.execute(
          { filePath: "src", extension: ".ts", severity: "warning" },
          ctx,
        );

        expect(result).toContain("warning");
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });

    describe("#when the LSP client throws", () => {
      it("#then returns an error message", async () => {
        const ctx = createMockToolContext({
          client: {
            lspDiagnostics: mock(async () => {
              throw new Error("Language server crashed");
            }),
          },
        } as never);

        const result = await lspDiagnosticsTool.execute({ filePath: "/src/index.ts" }, ctx);

        expect(result).toBe("Error: Language server crashed");
      });
    });
  });

  describe("#given invalid arguments", () => {
    describe("#when filePath is missing", () => {
      it("#then returns a validation error", async () => {
        const ctx = createMockToolContext();

        const result = await lspDiagnosticsTool.execute({}, ctx);

        expect(result).toMatch(/^Error:/);
      });
    });
  });
});
