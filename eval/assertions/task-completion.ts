// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

const CONTENT_INDICATORS = [
  "found",
  "result",
  "file",
  "function",
  "usage",
  "reference",
  "line",
  "match",
  "complete",
  "done",
  "created",
  "updated",
  "error",
  "fixed",
  "plan",
  "step",
];

export default function assertTaskCompletion(
  output: string,
  context: {
    prompt: string;
    vars: Record<string, string>;
    provider?: { id?: string };
  },
): { pass: boolean; score: number; reason: string; namedScores: { completion: number } } {
  if (!output || output.trim().length === 0) {
    return { pass: false, score: 0, reason: "Output is empty", namedScores: { completion: 0 } };
  }

  if (output.startsWith("[MOCK]") || output.startsWith("[BASELINE]")) {
    return {
      pass: true,
      score: 0,
      reason: `Mock/baseline response — assertion skipped. Output: ${output.slice(0, 100)}`,
      namedScores: { completion: 0 },
    };
  }

  const lowerOutput = output.toLowerCase();

  const matchedIndicators = CONTENT_INDICATORS.filter((word) =>
    lowerOutput.includes(word),
  );

  // Weighted score: content presence (0.3) + output length (0.3) + indicator matches (0.4)
  const hasContent = output.trim().length > 20 ? 0.3 : 0.1;
  const lengthScore = Math.min(output.length / 500, 1.0) * 0.3;
  const indicatorScore = Math.min(matchedIndicators.length / 4, 1.0) * 0.4;

  const score = Number((hasContent + lengthScore + indicatorScore).toFixed(2));
  const pass = score >= 0.3 && matchedIndicators.length >= 1;

  return {
    pass,
    score,
    reason: pass
      ? `Task completion detected (score: ${score}). Indicators: ${matchedIndicators.join(", ")}`
      : `Insufficient task completion indicators (score: ${score}). Found: ${matchedIndicators.length} indicators`,
    namedScores: { completion: score },
  };
}
