import type { PluginDefinition } from "../types/plugin"
import { grepPlugin } from "./grep"
import { globPlugin } from "./glob"
import { hashlineEditPlugin } from "./hashline-edit"
import { interactiveBashPlugin } from "./interactive-bash"
import { lookAtPlugin } from "./look-at"
import { skillPlugin } from "./skill"
import { delegateTaskPlugin } from "./delegate-task"
import {
  lspGotoDefinitionPlugin,
  lspFindReferencesPlugin,
  lspSymbolsPlugin,
  lspDiagnosticsPlugin,
  lspPrepareRenamePlugin,
  lspRenamePlugin,
} from "./lsp"
import { astGrepSearchPlugin, astGrepReplacePlugin } from "./ast-grep"
import { backgroundOutputPlugin, backgroundCancelPlugin } from "./background-task"
import { sessionListPlugin, sessionReadPlugin, sessionSearchPlugin, sessionInfoPlugin } from "./session-manager"
import { taskCreatePlugin, taskListPlugin, taskGetPlugin, taskUpdatePlugin } from "./task"

export const BUILTIN_TOOL_PLUGINS: PluginDefinition[] = [
  grepPlugin,
  globPlugin,
  hashlineEditPlugin,
  interactiveBashPlugin,
  lookAtPlugin,
  skillPlugin,
  delegateTaskPlugin,
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
  sessionSearchPlugin,
  sessionInfoPlugin,
  taskCreatePlugin,
  taskListPlugin,
  taskGetPlugin,
  taskUpdatePlugin,
]
