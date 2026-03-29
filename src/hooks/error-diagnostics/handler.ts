import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";
import { matchDiagnostic } from "./patterns";

const ERROR_DIAGNOSTIC_MARKER = "[ERROR DIAGNOSTIC]";

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>;
type EventHook = NonNullable<PluginHookContributions["event"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function appendDiagnosticBlock(text: string, diagnosticText: string): string {
  if (text.includes(ERROR_DIAGNOSTIC_MARKER)) {
    return text;
  }

  return `${text}\n${diagnosticText}`;
}

function buildDiagnosticText(category: string, severity: string, suggestion: string): string {
  return `${ERROR_DIAGNOSTIC_MARKER}\nCategory: ${category}\nSeverity: ${severity}\nSuggestion: ${suggestion}`;
}

function extractErrorTextFromProperties(properties: Record<string, unknown>): string {
  const rawError = properties.error;
  if (typeof rawError === "string") {
    return rawError;
  }

  if (isRecord(rawError) && typeof rawError.message === "string") {
    return rawError.message;
  }

  const message = properties.message;
  if (typeof message === "string") {
    return message;
  }

  return "";
}

function appendRecoveryContext(properties: Record<string, unknown>, diagnosticText: string): void {
  const existing = properties.recoveryContext;
  if (typeof existing === "string" && existing.includes(ERROR_DIAGNOSTIC_MARKER)) {
    return;
  }

  if (typeof existing === "string" && existing.length > 0) {
    properties.recoveryContext = `${existing}\n${diagnosticText}`;
    return;
  }

  properties.recoveryContext = diagnosticText;
}

export function createToolErrorHandler(): PostToolUseHook {
  return async (_input: unknown, output: unknown) => {
    try {
      if (!isRecord(output)) {
        return;
      }

      const toolOutput = output.output;
      if (typeof toolOutput !== "string" || toolOutput.includes(ERROR_DIAGNOSTIC_MARKER)) {
        return;
      }

      const diagnostic = matchDiagnostic(toolOutput);
      if (!diagnostic) {
        return;
      }

      const diagnosticText = buildDiagnosticText(
        diagnostic.category,
        diagnostic.severity,
        diagnostic.suggestion,
      );

      output.output = appendDiagnosticBlock(toolOutput, diagnosticText);
      log("[error-diagnostics] injected tool error diagnostic", {
        category: diagnostic.category,
        severity: diagnostic.severity,
      });
    } catch (error) {
      log("[error-diagnostics] tool.execute.after handling failed", { error: String(error) });
    }
  };
}

export function createEventErrorHandler(): EventHook {
  return async (input: unknown) => {
    try {
      if (!isRecord(input)) {
        return;
      }

      const event = input.event;
      if (!isRecord(event) || event.type !== "session.error") {
        return;
      }

      const properties = event.properties;
      if (!isRecord(properties)) {
        return;
      }

      const errorText = extractErrorTextFromProperties(properties);
      if (errorText.includes(ERROR_DIAGNOSTIC_MARKER)) {
        return;
      }

      const diagnostic = matchDiagnostic(errorText);
      if (!diagnostic) {
        return;
      }

      const diagnosticText = buildDiagnosticText(
        diagnostic.category,
        diagnostic.severity,
        diagnostic.suggestion,
      );

      appendRecoveryContext(properties, diagnosticText);
      log("[error-diagnostics] injected event recovery diagnostic", {
        eventType: event.type,
        category: diagnostic.category,
        severity: diagnostic.severity,
      });
    } catch (error) {
      log("[error-diagnostics] event handling failed", { error: String(error) });
    }
  };
}
