import { createAutoUpdatePlugin } from "./auto-update/plugin"
import { loopPlugin } from "./loops/plugin"
import type { PluginDefinition } from "../types/plugin"

export const BUILTIN_FEATURE_PLUGINS: PluginDefinition[] = [
  createAutoUpdatePlugin(),
  loopPlugin,
]
