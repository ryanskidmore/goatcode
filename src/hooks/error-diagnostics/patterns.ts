import type { DiagnosticPattern, DiagnosticResult } from "./types";

export const DIAGNOSTIC_PATTERNS: DiagnosticPattern[] = [
  {
    category: "rate-limit",
    patterns: [
      /\brate[- ]?limit(?:ed|ing)?\b/i,
      /\btoo many requests\b/i,
      /\bstatus(?:\s*(?:code)?:?\s*)429\b/i,
      /\bHTTP[/\s]+429\b/i,
      /\b429\s+Too Many/i,
      /\bquota exceeded\b/i,
    ],
    severity: "warning",
    suggestion:
      "Rate limited. Wait 30-60 seconds then retry. If persistent, check API quota or switch to a different model.",
  },
  {
    category: "auth",
    patterns: [/unauthorized/i, /invalid.*api.*key/i, /authentication failed/i, /403 forbidden/i],
    severity: "error",
    suggestion: "Authentication failed. Verify API key is set correctly and has not expired.",
  },
  {
    category: "timeout",
    patterns: [
      /\brequest\s+timed?\s*out\b/i,
      /\bconnection\s+timed?\s*out\b/i,
      /\boperation\s+timed?\s*out\b/i,
      /\bdeadline exceeded\b/i,
      /\bETIMEDOUT\b/,
    ],
    severity: "warning",
    suggestion:
      "Request timed out. Try a shorter prompt, reduce context size, or check network connectivity.",
  },
  {
    category: "permission",
    patterns: [/permission denied/i, /EACCES/i, /operation not permitted/i],
    severity: "error",
    suggestion:
      "Permission denied. Check file/directory permissions or run with appropriate privileges.",
  },
  {
    category: "file-system",
    patterns: [/ENOENT/i, /no such file/i, /file not found/i, /EEXIST/i, /directory not empty/i],
    severity: "error",
    suggestion:
      "File system error. Verify the path exists and is accessible. Check for typos in file paths.",
  },
  {
    category: "network",
    patterns: [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /network.*error/i,
      /fetch failed/i,
      /socket hang up/i,
    ],
    severity: "error",
    suggestion:
      "Network error. Check internet connectivity and that the target service is running.",
  },
  {
    category: "memory",
    patterns: [/out of memory/i, /heap.*limit/i, /allocation failed/i, /JavaScript heap/i],
    severity: "error",
    suggestion:
      "Memory limit reached. Reduce context window size, compact the session, or restart with fewer files loaded.",
  },
  {
    category: "syntax",
    patterns: [/SyntaxError/i, /unexpected token/i, /parsing error/i],
    severity: "error",
    suggestion:
      "Syntax error detected. Check for malformed code, missing brackets, or invalid characters.",
  },
  {
    category: "type-error",
    patterns: [/TypeError/i, /is not a function/i, /cannot read propert/i, /undefined is not/i],
    severity: "error",
    suggestion:
      "Type error. Check that the variable exists and is the expected type before accessing properties.",
  },
];

export function matchDiagnostic(text: string): DiagnosticResult | null {
  for (const diagnosticPattern of DIAGNOSTIC_PATTERNS) {
    for (const pattern of diagnosticPattern.patterns) {
      const match = text.match(pattern);
      if (!match) {
        continue;
      }

      return {
        category: diagnosticPattern.category,
        severity: diagnosticPattern.severity,
        matched: match[0],
        suggestion: diagnosticPattern.suggestion,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}
