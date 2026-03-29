import { definePlugin } from "../../../plugin-api";
import { lspDiagnosticsTool } from "./handler";

export const lspDiagnosticsPlugin = definePlugin({
  name: "lsp-diagnostics",
  version: "0.1.0",
  tools: {
    lsp_diagnostics: lspDiagnosticsTool,
  },
});
