import { definePlugin } from "../../../plugin-api";
import { lspFindReferencesTool } from "./handler";

export const lspFindReferencesPlugin = definePlugin({
  name: "lsp-find-references",
  version: "0.1.0",
  tools: {
    lsp_find_references: lspFindReferencesTool,
  },
});
