import { createAutoUpdatePlugin } from "./auto-update/plugin"
import { ralphLoopPlugin } from "./loops/ralph-loop/plugin"
import { ulwLoopPlugin } from "./loops/ulw-loop/plugin"
import type { PluginDefinition } from "../types/plugin"

export const BUILTIN_FEATURE_PLUGINS: PluginDefinition[] = [
  createAutoUpdatePlugin(),
  ralphLoopPlugin,
  ulwLoopPlugin,
]
