import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "../../../shared/logger";

type SystemTransformOutput = {
  system?: string;
  prompt?: string;
  text?: string;
  content?: string;
};

function appendToSystemOutput(output: SystemTransformOutput, injection: string): void {
  if (typeof output.system === "string") {
    output.system += injection;
    return;
  }

  if (typeof output.prompt === "string") {
    output.prompt += injection;
    return;
  }

  if (typeof output.text === "string") {
    output.text += injection;
    return;
  }

  if (typeof output.content === "string") {
    output.content += injection;
  }
}

function collectRuleFiles(workspaceDirectory: string): string[] {
  const candidates = [join(workspaceDirectory, ".rules"), join(workspaceDirectory, "RULES.md")];
  return candidates.filter((path) => existsSync(path));
}

export function createRulesInjectorHandler(workspaceDirectory: string) {
  return async (_input: unknown, output: unknown): Promise<void> => {
    const typedOutput = output as SystemTransformOutput;
    const ruleFiles = collectRuleFiles(workspaceDirectory);

    if (ruleFiles.length === 0) {
      return;
    }

    let injection = "\n\n[Injected Rules]\n";
    for (const ruleFile of ruleFiles) {
      try {
        const content = readFileSync(ruleFile, "utf8");
        injection += `\n[Rule: ${ruleFile}]\n${content}\n`;
      } catch (error) {
        log("[rules-injector] Failed to read rules file", {
          ruleFile,
          error: String(error),
        });
      }
    }

    appendToSystemOutput(typedOutput, injection);
  };
}
