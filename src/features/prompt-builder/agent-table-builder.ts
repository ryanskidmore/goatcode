export interface AgentTableEntry {
  name: string;
  description: string;
  whenToUse: string;
}

const TABLE_HEADER = "| Agent | Description | When to Use |";
const TABLE_SEPARATOR = "|-------|-------------|-------------|";

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function buildAgentTable(agents: AgentTableEntry[]): string {
  if (agents.length === 0) return "";

  const rows = agents.map((agent) => {
    const desc = agent.description.split(".")[0] || agent.description;
    return `| \`${escapeTableCell(agent.name)}\` | ${escapeTableCell(desc)} | ${escapeTableCell(agent.whenToUse)} |`;
  });

  return ["### Available Agents", "", TABLE_HEADER, TABLE_SEPARATOR, ...rows].join("\n");
}
