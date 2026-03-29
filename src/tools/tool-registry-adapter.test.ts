import { describe, it, expect } from "bun:test";
import type { PluginToolContribution, ToolsRecord } from "../types/tool";
import { adaptToolsToRegistry, mergeToolRegistries } from "./tool-registry-adapter";

function makeToolContribution(): PluginToolContribution {
  return {
    description: "test tool",
    args: {},
    execute: async () => "ok",
  };
}

describe("adaptToolsToRegistry", () => {
  describe("#given a tools contribution record", () => {
    describe("#when adaptToolsToRegistry is called", () => {
      it("#then it returns a copied tools registry with the same entries", () => {
        const tools: Record<string, PluginToolContribution> = {
          alpha: makeToolContribution(),
          beta: makeToolContribution(),
        };

        const result = adaptToolsToRegistry(tools);

        expect(result).toEqual(tools);
        expect(result).not.toBe(tools);
      });
    });
  });
});

describe("mergeToolRegistries", () => {
  describe("#given multiple registries with distinct tool names", () => {
    describe("#when mergeToolRegistries is called", () => {
      it("#then it merges all registries without collisions", () => {
        const registryOne: ToolsRecord = {
          alpha: makeToolContribution(),
        };
        const registryTwo: ToolsRecord = {
          beta: makeToolContribution(),
        };

        const result = mergeToolRegistries(registryOne, registryTwo);

        expect(result).toEqual({
          alpha: registryOne.alpha,
          beta: registryTwo.beta,
        });
      });
    });
  });
});
