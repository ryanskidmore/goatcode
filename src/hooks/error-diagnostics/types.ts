export type ErrorCategory =
  | "rate-limit"
  | "auth"
  | "timeout"
  | "permission"
  | "file-system"
  | "network"
  | "memory"
  | "syntax"
  | "type-error"
  | "unknown";

export type DiagnosticPattern = {
  category: ErrorCategory;
  patterns: RegExp[];
  severity: "error" | "warning" | "info";
  suggestion: string;
};

export type DiagnosticResult = {
  category: ErrorCategory;
  severity: string;
  matched: string;
  suggestion: string;
  timestamp: string;
};
