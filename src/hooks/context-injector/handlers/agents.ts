import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { log } from "../../../shared/logger";

type ToolExecuteAfterInput = {
  tool?: string;
};

type ToolExecuteAfterOutput = {
  title?: string;
  output?: string;
};

function resolveReadPath(workspaceDirectory: string, title?: string): string | null {
  if (!title) {
    return null;
  }

  if (isAbsolute(title)) {
    return title;
  }

  return resolve(workspaceDirectory, title);
}

function collectAgentsPaths(fileDirectory: string, workspaceDirectory: string): string[] {
  const paths: string[] = [];
  let current = fileDirectory;

  while (true) {
    const agentsPath = join(current, "AGENTS.md");
    if (existsSync(agentsPath)) {
      paths.push(agentsPath);
    }

    if (current === workspaceDirectory) {
      break;
    }

    const parent = dirname(current);
    if (parent === current || !parent.startsWith(workspaceDirectory)) {
      break;
    }

    current = parent;
  }

  return paths.reverse();
}

export function createAgentsInjectorHandler(workspaceDirectory: string) {
  // Track which AGENTS.md files have been fully injected to avoid
  // repeating hundreds of lines of context on every read call.
  const injectedAgentsPaths = new Set<string>();

  return async (input: unknown, output: unknown): Promise<void> => {
    const typedInput = input as ToolExecuteAfterInput;
    const typedOutput = output as ToolExecuteAfterOutput;

    const toolName = typedInput.tool?.toLowerCase();
    if (toolName !== "read") {
      return;
    }

    const filePath = resolveReadPath(workspaceDirectory, typedOutput.title);
    if (!filePath || typeof typedOutput.output !== "string") {
      return;
    }

    const fileDirectory = dirname(filePath);
    const agentsPaths = collectAgentsPaths(fileDirectory, workspaceDirectory);

    for (const agentsPath of agentsPaths) {
      if (injectedAgentsPaths.has(agentsPath)) {
        // Already injected full content — append a short back-reference only
        typedOutput.output += `\n\n[Directory Context: ${agentsPath} — see full AGENTS.md injected above]`;
        continue;
      }

      try {
        const content = readFileSync(agentsPath, "utf8");
        typedOutput.output += `\n\n[Directory Context: ${agentsPath}]\n${content}`;
        injectedAgentsPaths.add(agentsPath);
      } catch (error) {
        log("[agents-injector] Failed to read AGENTS.md", {
          agentsPath,
          error: String(error),
        });
      }
    }
  };
}
