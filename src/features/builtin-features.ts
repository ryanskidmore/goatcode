import { createAutoUpdatePlugin } from "./auto-update/plugin";
import { backgroundAgentPlugin } from "./background-agent/plugin";
import { loopPlugin } from "./loops/plugin";
import type { PluginDefinition } from "../types/plugin";

export const BUILTIN_FEATURE_PLUGINS: PluginDefinition[] = [
  createAutoUpdatePlugin(),
  backgroundAgentPlugin,
  loopPlugin,
];
