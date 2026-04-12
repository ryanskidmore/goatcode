import type { PluginDefinition } from "../types/plugin";
import { grepPlugin } from "./grep";
import { globPlugin } from "./glob";
import { hashlineEditPlugin } from "./hashline-edit";
import { skillPlugin } from "./skill";
// skill_mcp is intentionally excluded — it requires ctx.client MCP integration
// that is not yet available in the tool execute context. Re-enable once implemented.
// import { skillMcpPlugin } from "./skill-mcp"
import { createDelegateTaskPlugin } from "./delegate-task";
import type { CategoryOverrides } from "../types/config";
import {
  lspGotoDefinitionPlugin,
  lspFindReferencesPlugin,
  lspSymbolsPlugin,
  lspDiagnosticsPlugin,
  lspPrepareRenamePlugin,
  lspRenamePlugin,
} from "./lsp";
import { astGrepSearchPlugin, astGrepReplacePlugin } from "./ast-grep";
import { backgroundOutputPlugin, backgroundCancelPlugin } from "./background-task";
import { sessionListPlugin, sessionReadPlugin, sessionInfoPlugin } from "./session-manager";

export function createBuiltinToolPlugins(
  getCategoryOverrides?: () => CategoryOverrides | undefined,
): PluginDefinition[] {
  return [
    grepPlugin,
    globPlugin,
    hashlineEditPlugin,
    skillPlugin,
    createDelegateTaskPlugin(getCategoryOverrides),
    lspGotoDefinitionPlugin,
    lspFindReferencesPlugin,
    lspSymbolsPlugin,
    lspDiagnosticsPlugin,
    lspPrepareRenamePlugin,
    lspRenamePlugin,
    astGrepSearchPlugin,
    astGrepReplacePlugin,
    backgroundOutputPlugin,
    backgroundCancelPlugin,
    sessionListPlugin,
    sessionReadPlugin,
    sessionInfoPlugin,
  ];
}

export const BUILTIN_TOOL_PLUGINS: PluginDefinition[] = createBuiltinToolPlugins();
