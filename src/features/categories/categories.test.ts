import { describe, expect, it } from "bun:test";
import { CategoryResolver, resolveCategory } from "./category-resolver";
import { DEFAULT_CATEGORIES } from "./category-config";

describe("category-resolver", () => {
  describe("#given built-in category names", () => {
    describe("#when resolve is called", () => {
      it("#then resolves each category to its default model", () => {
        const resolver = new CategoryResolver();

        expect(resolver.resolve("visual-engineering")?.model).toBe(
          DEFAULT_CATEGORIES["visual-engineering"].model,
        );
        expect(resolver.resolve("ultrabrain")?.model).toBe(DEFAULT_CATEGORIES.ultrabrain.model);
        expect(resolver.resolve("deep")?.model).toBe(DEFAULT_CATEGORIES.deep.model);
        expect(resolver.resolve("artistry")?.model).toBe(DEFAULT_CATEGORIES.artistry.model);
        expect(resolver.resolve("quick")?.model).toBe(DEFAULT_CATEGORIES.quick.model);
        expect(resolver.resolve("unspecified-low")?.model).toBe(
          DEFAULT_CATEGORIES["unspecified-low"].model,
        );
        expect(resolver.resolve("unspecified-high")?.model).toBe(
          DEFAULT_CATEGORIES["unspecified-high"].model,
        );
        expect(resolver.resolve("writing")?.model).toBe(DEFAULT_CATEGORIES.writing.model);
      });
    });
  });

  describe("#given category overrides", () => {
    describe("#when model override is provided", () => {
      it("#then override model takes precedence over defaults", () => {
        const resolver = new CategoryResolver();

        const resolved = resolver.resolve("visual-engineering", {
          "visual-engineering": {
            model: "custom/model",
          },
        });

        expect(resolved?.model).toBe("custom/model");
      });
    });

    describe("#when resolveCategory helper is called with overrides", () => {
      it("#then returns merged category config", () => {
        const resolved = resolveCategory("writing", {
          writing: {
            model: "custom/writer-model",
            variant: "high",
            fallback_models: ["openai/gpt-5.4-mini"],
            fallback_mode: "append",
          },
        });

        expect(resolved?.model).toBe("custom/writer-model");
        expect(resolved?.variant).toBe("high");
        expect(resolved?.fallback_models).toEqual(["openai/gpt-5.4-mini"]);
        expect(resolved?.fallback_mode).toBe("append");
        expect(typeof resolved?.prompt_append).toBe("string");
      });
    });
  });

  describe("#given an unknown category", () => {
    describe("#when resolve is called", () => {
      it("#then returns undefined", () => {
        const resolver = new CategoryResolver();
        expect(resolver.resolve("not-a-category")).toBeUndefined();
      });
    });
  });
});
