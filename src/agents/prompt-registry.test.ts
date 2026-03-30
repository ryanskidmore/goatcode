import { describe, it, expect } from "bun:test";
import type { BuiltinAgentName } from "../types/agent";
import { PROMPT_REGISTRY, getPromptVersion } from "./prompt-registry";

const ACTIVE_AGENT_NAMES = [
  "orchestrator",
  "deep-worker",
  "planner",
  "advisor",
  "researcher",
  "explorer",
  "worker",
] as const satisfies BuiltinAgentName[];

const BUILTIN_AGENT_NAMES = [
  "orchestrator",
  "deep-worker",
  "planner",
  "advisor",
  "researcher",
  "explorer",
  "worker",
] as const satisfies BuiltinAgentName[];

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

describe("prompt registry", () => {
  describe("#given the active agents", () => {
    describe("#when checking prompt metadata presence", () => {
      it("#then all 7 active agents have prompt metadata", () => {
        for (const agentName of ACTIVE_AGENT_NAMES) {
          expect(PROMPT_REGISTRY[agentName]).toBeDefined();
        }
      });
    });
  });

  describe("#given all builtin agents", () => {
    describe("#when checking registry completeness", () => {
      it("#then there are no missing builtin entries", () => {
        const registryKeys = Object.keys(PROMPT_REGISTRY).sort();
        const builtinKeys = [...BUILTIN_AGENT_NAMES].sort();
        expect(registryKeys).toEqual(builtinKeys);
      });
    });
  });

  describe("#given prompt metadata entries", () => {
    describe("#when validating metadata fields", () => {
      it("#then all versions are valid semver", () => {
        for (const meta of Object.values(PROMPT_REGISTRY)) {
          expect(SEMVER_REGEX.test(meta.version)).toBe(true);

          for (const entry of meta.changelog) {
            expect(SEMVER_REGEX.test(entry.version)).toBe(true);
          }
        }
      });

      it("#then all dates are valid ISO dates", () => {
        for (const meta of Object.values(PROMPT_REGISTRY)) {
          expect(ISO_DATE_REGEX.test(meta.date)).toBe(true);
          expect(new Date(meta.date).toISOString().slice(0, 10)).toBe(meta.date);

          for (const entry of meta.changelog) {
            expect(ISO_DATE_REGEX.test(entry.date)).toBe(true);
            expect(new Date(entry.date).toISOString().slice(0, 10)).toBe(entry.date);
          }
        }
      });

      it("#then all v1.0.0 changelog entries use the standardized description", () => {
        for (const meta of Object.values(PROMPT_REGISTRY)) {
          for (const entry of meta.changelog) {
            if (entry.version === "1.0.0") {
              expect(entry.description).toBe(
                "Production-grade prompt with structured sections and quality gates",
              );
            }
          }
        }
      });
    });
  });

  describe("#given getPromptVersion", () => {
    describe("#when reading the version for a builtin agent", () => {
      it("#then it returns the registry version", () => {
        for (const agentName of BUILTIN_AGENT_NAMES) {
          expect(getPromptVersion(agentName)).toBe(PROMPT_REGISTRY[agentName].version);
        }
      });
    });
  });
});
