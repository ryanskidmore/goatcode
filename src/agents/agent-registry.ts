import type { PluginAgentContribution } from "../types/agent";
import { log } from "../shared/logger";

export class AgentRegistry {
  private readonly agents = new Map<string, PluginAgentContribution>();

  register(name: string, agent: PluginAgentContribution): void {
    if (this.agents.has(name)) {
      log(`[AgentRegistry] Agent "${name}" already registered, overwriting`);
    }
    this.agents.set(name, agent);
  }

  get(name: string): PluginAgentContribution | undefined {
    return this.agents.get(name);
  }

  getAll(): Map<string, PluginAgentContribution> {
    return new Map(this.agents);
  }

  get size(): number {
    return this.agents.size;
  }
}
