import { definePlugin } from "../../../plugin-api";
import { createAstGrepReplaceTool } from "./handler";

export const astGrepReplacePlugin = definePlugin({
  name: "ast-grep-replace",
  version: "0.1.0",
  tools: {
    ast_grep_replace: createAstGrepReplaceTool(),
  },
});
