import { definePlugin } from "../../../plugin-api";
import { lspRenameTool } from "./handler";

export const lspRenamePlugin = definePlugin({
  name: "lsp-rename",
  version: "0.1.0",
  tools: {
    lsp_rename: lspRenameTool,
  },
});
