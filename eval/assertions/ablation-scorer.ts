// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

const QUALITY_INDICATORS = [
  "fix",
  "error",
  "found",
  "parse",
  "json",
  "handler",
  "response",
  "resolved",
  "updated",
  "corrected",
  "phase",
  "context",
  "summary",
  "project",
  "current",
  "plan",
  "step",
  "complete",
];

export default function assertAblationScore(
  output: string,
  context: {
    prompt: string;
    vars: Record<string, string>;
    provider?: { id?: string; label?: string };
  },
): { pass: boolean; score: number; reason: string; namedScores: { quality_score: number } } {
  if (!output || output.trim().length === 0) {
    return { pass: false, score: 0, reason: "Output is empty", namedScores: { quality_score: 0 } };
  }

  if (output.startsWith("[MOCK]")) {
    return {
      pass: true,
      score: 0,
      reason: `Mock/skipped — no live server. Provider: ${context.provider?.label ?? "unknown"}`,
      namedScores: { quality_score: 0 },
    };
  }

  const lowerOutput = output.toLowerCase();
  const providerLabel = context.provider?.label ?? "unknown";

  const matchedIndicators = QUALITY_INDICATORS.filter((word) =>
    lowerOutput.includes(word),
  );

  const lengthScore = Math.min(output.length / 800, 1.0) * 0.25;
  const indicatorScore =
    Math.min(matchedIndicators.length / 5, 1.0) * 0.5;

  const score = Number(
    (lengthScore + indicatorScore).toFixed(2),
  );

  if (providerLabel === "full") {
    const pass = score >= 0.3 && matchedIndicators.length >= 2;
    return {
      pass,
      score,
      reason: pass
        ? `Full provider quality OK (score: ${score}). Indicators: ${matchedIndicators.join(", ")}`
        : `Full provider quality low (score: ${score}). Indicators found: ${matchedIndicators.length}`,
      namedScores: { quality_score: score },
    };
  }

  const pass = matchedIndicators.length >= 1;
  return {
    pass,
    score,
    reason: pass
      ? `Ablated [${providerLabel}] quality measured (score: ${score}). Indicators: ${matchedIndicators.join(", ")}`
      : `Ablated [${providerLabel}] produced minimal output (score: ${score}). Indicators found: ${matchedIndicators.length}`,
    namedScores: { quality_score: score },
  };
}
