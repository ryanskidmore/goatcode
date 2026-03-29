// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

const TOOL_KEYWORDS = [
  "lsp",
  "goto_definition",
  "find_references",
  "diagnostics",
  "symbols",
  "grep",
  "glob",
  "ast_grep",
  "search",
  "edit",
  "hashline_edit",
  "rename",
  "bash",
];

export default function assertToolAccuracy(
  output: string,
  context: {
    prompt: string;
    vars: Record<string, string>;
    provider?: { id?: string };
  },
): { pass: boolean; score: number; reason: string; namedScores: { tool_accuracy: number } } {
  if (!output || output.trim().length === 0) {
    return { pass: false, score: 0, reason: "Output is empty", namedScores: { tool_accuracy: 0 } };
  }

  if (output.startsWith("[MOCK]") || output.startsWith("[BASELINE]")) {
    return {
      pass: true,
      score: 0,
      reason: `Mock/baseline response — assertion skipped. Output: ${output.slice(0, 100)}`,
      namedScores: { tool_accuracy: 0 },
    };
  }

  const lowerOutput = output.toLowerCase();
  const matchedTools = TOOL_KEYWORDS.filter((kw) =>
    lowerOutput.includes(kw),
  );

  const score = Math.min(matchedTools.length / 3, 1.0);
  const pass = matchedTools.length >= 1;

  return {
    pass,
    score,
    reason: pass
      ? `Found ${matchedTools.length} tool references: ${matchedTools.join(", ")}`
      : "No tool references found in output",
    namedScores: { tool_accuracy: score },
  };
}
