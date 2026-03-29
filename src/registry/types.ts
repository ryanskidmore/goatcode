import type { PluginDefinition } from "../types/plugin";

export interface ResolvedPlugin {
  plugin: PluginDefinition;
  order: number;
}

export interface ResolutionResult {
  order: PluginDefinition[];
  map: Map<string, ResolvedPlugin>;
}
