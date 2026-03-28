import { orchestratorPlugin } from "./orchestrator"
import { deepWorkerPlugin } from "./deep-worker"
import { planBuilderPlugin } from "./plan-builder"
import { advisorPlugin } from "./advisor"
import { researcherPlugin } from "./researcher"
import { explorerPlugin } from "./explorer"
import { workerPlugin } from "./worker"
import type { PluginDefinition } from "../types/plugin"

export const BUILTIN_AGENT_PLUGINS: PluginDefinition[] = [
  orchestratorPlugin,
  deepWorkerPlugin,
  planBuilderPlugin,
  advisorPlugin,
  researcherPlugin,
  explorerPlugin,
  workerPlugin,
]
