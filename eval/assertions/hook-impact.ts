// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

interface HookGroupSignals {
  keywords: string[];
  description: string;
}

const HOOK_GROUPS: Record<string, HookGroupSignals> = {
  "no-recovery-hooks": {
    keywords: [
      "fix",
      "retry",
      "recover",
      "fallback",
      "error",
      "catch",
      "handle",
      "repair",
      "corrected",
      "resolved",
    ],
    description: "error-recovery signals",
  },
  "no-quality-hooks": {
    keywords: [
      "lint",
      "guard",
      "validate",
      "quality",
      "check",
      "comment",
      "block",
      "catch",
      "empty",
      "verified",
    ],
    description: "code quality signals",
  },
  "no-context-hooks": {
    keywords: [
      "context",
      "phase",
      "inject",
      "reminder",
      "current",
      "project",
      "state",
      "summary",
      "scope",
      "awareness",
    ],
    description: "context injection signals",
  },
};

const ALL_SIGNALS = [
  ...new Set(
    Object.values(HOOK_GROUPS).flatMap((group) => group.keywords),
  ),
];

export default function assertHookImpact(
  output: string,
  context: {
    prompt: string;
    vars: Record<string, string>;
    provider?: { id?: string; label?: string };
  },
): { pass: boolean; score: number; reason: string; namedScores: { hook_impact: number } } {
  if (!output || output.trim().length === 0) {
    return { pass: false, score: 0, reason: "Output is empty", namedScores: { hook_impact: 0 } };
  }

  if (output.startsWith("[MOCK]")) {
    return {
      pass: true,
      score: 0,
      reason: `Mock/skipped — no live server. Provider: ${context.provider?.label ?? "unknown"}`,
      namedScores: { hook_impact: 0 },
    };
  }

  const lowerOutput = output.toLowerCase();
  const providerLabel = context.provider?.label ?? "unknown";

  if (providerLabel === "full") {
    return scoreFullProvider(lowerOutput);
  }

  const hookGroup = HOOK_GROUPS[providerLabel];
  if (hookGroup) {
    return scoreAblatedProvider(lowerOutput, providerLabel, hookGroup);
  }

  return scoreGeneric(lowerOutput, providerLabel);
}

function scoreFullProvider(
  lowerOutput: string,
): { pass: boolean; score: number; reason: string; namedScores: { hook_impact: number } } {
  const matched = ALL_SIGNALS.filter((kw) => lowerOutput.includes(kw));
  const score = Number(Math.min(matched.length / 8, 1.0).toFixed(2));
  const pass = matched.length >= 2;

  return {
    pass,
    score,
    reason: pass
      ? `Full provider shows broad hook signals (score: ${score}). Matched: ${matched.slice(0, 8).join(", ")}`
      : `Full provider lacks hook signals (score: ${score}). Matched: ${matched.length}`,
    namedScores: { hook_impact: score },
  };
}

function scoreAblatedProvider(
  lowerOutput: string,
  label: string,
  group: HookGroupSignals,
): { pass: boolean; score: number; reason: string; namedScores: { hook_impact: number } } {
  const matchedGroupSignals = group.keywords.filter((kw) =>
    lowerOutput.includes(kw),
  );

  const disabledGroupPresence = matchedGroupSignals.length / group.keywords.length;

  const impactScore = Number((1.0 - disabledGroupPresence).toFixed(2));
  const pass = impactScore >= 0.5;

  return {
    pass,
    score: impactScore,
    reason: pass
      ? `Ablated [${label}] shows measurable hook impact (score: ${impactScore}). ${matchedGroupSignals.length}/${group.keywords.length} ${group.description} present.`
      : `Ablated [${label}] shows weak hook impact (score: ${impactScore}). ${matchedGroupSignals.length}/${group.keywords.length} ${group.description} present.`,
    namedScores: { hook_impact: impactScore },
  };
}

function scoreGeneric(
  lowerOutput: string,
  label: string,
): { pass: boolean; score: number; reason: string; namedScores: { hook_impact: number } } {
  const matched = ALL_SIGNALS.filter((kw) => lowerOutput.includes(kw));
  const score = Number(Math.min(matched.length / 6, 1.0).toFixed(2));

  return {
    pass: true,
    score,
    reason: `Generic scoring for [${label}] (score: ${score}). Signals: ${matched.length}`,
    namedScores: { hook_impact: score },
  };
}
