import { describe, it, expect } from "bun:test";
import { buildToolHook } from "./bridge";
import type { PluginToolContribution } from "../types/tool";

function makeToolContribution(): PluginToolContribution {
  return { execute: async () => "ok" } as unknown as PluginToolContribution;
}

describe("buildToolHook", () => {
  describe("#given a tools record with one entry", () => {
    describe("#when buildToolHook is called", () => {
      it("#then it returns the tools record", () => {
        const tools: Record<string, PluginToolContribution> = {
          testTool: makeToolContribution(),
        };

        const result = buildToolHook(tools);

        expect(result).toEqual(tools);
      });
    });
  });

  describe("#given an empty tools record", () => {
    describe("#when buildToolHook is called", () => {
      it("#then it returns undefined", () => {
        const tools: Record<string, PluginToolContribution> = {};

        const result = buildToolHook(tools);

        expect(result).toBeUndefined();
      });
    });
  });

  describe("#given a tools record with multiple entries", () => {
    describe("#when buildToolHook is called", () => {
      it("#then all entries are present in the result", () => {
        const tools: Record<string, PluginToolContribution> = {
          tool1: makeToolContribution(),
          tool2: makeToolContribution(),
          tool3: makeToolContribution(),
        };

        const result = buildToolHook(tools);

        expect(result).toEqual(tools);
        expect(Object.keys(result!)).toHaveLength(3);
        expect(result).toHaveProperty("tool1");
        expect(result).toHaveProperty("tool2");
        expect(result).toHaveProperty("tool3");
      });
    });
  });
});
