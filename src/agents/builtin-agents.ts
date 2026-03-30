import { orchestratorPlugin } from "./orchestrator";
import { deepWorkerPlugin } from "./deep-worker";
import { plannerPlugin } from "./planner";
import { advisorPlugin } from "./advisor";
import { researcherPlugin } from "./researcher";
import { explorerPlugin } from "./explorer";
import { workerPlugin } from "./worker";
import type { PluginDefinition } from "../types/plugin";

export const BUILTIN_AGENT_PLUGINS: PluginDefinition[] = [
  orchestratorPlugin,
  deepWorkerPlugin,
  plannerPlugin,
  advisorPlugin,
  researcherPlugin,
  explorerPlugin,
  workerPlugin,
];
