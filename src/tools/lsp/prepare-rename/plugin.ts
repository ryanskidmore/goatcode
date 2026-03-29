import { definePlugin } from "../../../plugin-api";
import { lspPrepareRenameTool } from "./handler";

export const lspPrepareRenamePlugin = definePlugin({
  name: "lsp-prepare-rename",
  version: "0.1.0",
  tools: {
    lsp_prepare_rename: lspPrepareRenameTool,
  },
});
