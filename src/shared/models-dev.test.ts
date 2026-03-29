import { describe, expect, it } from "bun:test";
import {
  buildModelsDevIndex,
  resolveWithModelsDevData,
  createModelsDevCache,
  type ModelsDevProvider,
  type ModelsDevIndex,
} from "./models-dev";

const fixture: Record<string, ModelsDevProvider> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    npm: "@ai-sdk/anthropic",
    models: {
      "claude-opus-4-6": {
        id: "claude-opus-4-6",
        name: "Claude Opus 4.6",
      },
    },
  },
  opencode: {
    id: "opencode",
    name: "OpenCode Zen",
    models: {
      "claude-opus-4-6": {
        id: "claude-opus-4-6",
        name: "Claude Opus 4.6",
        provider: { npm: "@ai-sdk/anthropic" },
      },
      "unknown-no-provider": {
        id: "unknown-no-provider",
        name: "Unknown No Provider",
      },
    },
  },
  "cloudflare-ai-gateway": {
    id: "cloudflare-ai-gateway",
    name: "Cloudflare AI Gateway",
    models: {
      "anthropic/claude-3.5-sonnet": {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
      },
    },
  },
};

describe("models-dev index", () => {
  describe("#given fixture provider data", () => {
    const index = buildModelsDevIndex(fixture);

    describe("#when building platform to canonical map", () => {
      it("#then maps direct provider models to canonical ids", () => {
        expect(index.byPlatformModel.get("anthropic/claude-opus-4-6")).toBe(
          "anthropic/claude-opus-4-6",
        );
      });

      it("#then maps opencode models using provider npm mapping", () => {
        expect(index.byPlatformModel.get("opencode/claude-opus-4-6")).toBe(
          "anthropic/claude-opus-4-6",
        );
      });

      it("#then maps pass-through provider models as-is", () => {
        expect(index.byPlatformModel.get("cloudflare-ai-gateway/anthropic/claude-3.5-sonnet")).toBe(
          "anthropic/claude-3.5-sonnet",
        );
      });

      it("#then skips models that cannot be canonically mapped", () => {
        expect(index.byPlatformModel.get("opencode/unknown-no-provider")).toBeUndefined();
      });
    });

    describe("#when building reverse canonical map", () => {
      it("#then tracks all platform models that map to same canonical id", () => {
        expect(index.byCanonical.get("anthropic/claude-opus-4-6")).toEqual(
          new Set(["anthropic/claude-opus-4-6", "opencode/claude-opus-4-6"]),
        );
      });
    });
  });
});

describe("resolveWithModelsDevData", () => {
  describe("#given a built models.dev index", () => {
    const index = buildModelsDevIndex(fixture);

    describe("#when resolving direct provider model ids", () => {
      it("#then returns canonical ids", () => {
        expect(resolveWithModelsDevData("anthropic/claude-opus-4-6", index)).toBe(
          "anthropic/claude-opus-4-6",
        );
      });
    });

    describe("#when resolving opencode model ids", () => {
      it("#then returns canonical ids using model provider metadata", () => {
        expect(resolveWithModelsDevData("opencode/claude-opus-4-6", index)).toBe(
          "anthropic/claude-opus-4-6",
        );
      });
    });

    describe("#when resolving pass-through provider model ids", () => {
      it("#then returns canonical ids from embedded prefixes", () => {
        expect(
          resolveWithModelsDevData("cloudflare-ai-gateway/anthropic/claude-3.5-sonnet", index),
        ).toBe("anthropic/claude-3.5-sonnet");
      });
    });

    describe("#when resolving unknown model ids", () => {
      it("#then returns undefined", () => {
        expect(resolveWithModelsDevData("opencode/does-not-exist", index)).toBeUndefined();
      });
    });

    describe("#when resolving opencode model without provider metadata", () => {
      it("#then returns undefined", () => {
        expect(resolveWithModelsDevData("opencode/unknown-no-provider", index)).toBeUndefined();
      });
    });
  });
});

describe("toCanonicalModelId fall-through", () => {
  describe("#given a model with an unrecognised provider npm package", () => {
    const data: Record<string, ModelsDevProvider> = {
      someplatform: {
        id: "someplatform",
        name: "Some Platform",
        models: {
          "known-provider/some-model": {
            id: "known-provider/some-model",
            name: "Some Model",
            provider: { npm: "@ai-sdk/unrecognised-package" },
          },
        },
      },
    };

    describe("#when building the index", () => {
      it("#then falls through to pass-through strategy and maps the model id", () => {
        const index = buildModelsDevIndex(data);
        expect(index.byPlatformModel.get("someplatform/known-provider/some-model")).toBe(
          "known-provider/some-model",
        );
      });
    });
  });
});

describe("createModelsDevCache", () => {
  const nonEmptyIndex = buildModelsDevIndex(fixture);
  const emptyIndex: ModelsDevIndex = {
    byPlatformModel: new Map(),
    byCanonical: new Map(),
    providers: new Map(),
  };

  describe("#given a fetch function that returns a non-empty index", () => {
    describe("#when get is called twice within the TTL", () => {
      it("#then returns the same cached instance on the second call", async () => {
        let callCount = 0;
        const fetchFn = async (): Promise<ModelsDevIndex> => {
          callCount++;
          return nonEmptyIndex;
        };
        const cache = createModelsDevCache(60_000, fetchFn);

        const result1 = await cache.get();
        const result2 = await cache.get();

        expect(callCount).toBe(1);
        expect(result1).toBe(result2);
      });
    });

    describe("#when get is called after the TTL expires", () => {
      it("#then fetches fresh data on the next call", async () => {
        let callCount = 0;
        const fetchFn = async (): Promise<ModelsDevIndex> => {
          callCount++;
          return nonEmptyIndex;
        };
        const cache = createModelsDevCache(0, fetchFn);

        await cache.get();
        await cache.get();

        expect(callCount).toBe(2);
      });
    });

    describe("#when get is called after clear", () => {
      it("#then fetches fresh data", async () => {
        let callCount = 0;
        const fetchFn = async (): Promise<ModelsDevIndex> => {
          callCount++;
          return nonEmptyIndex;
        };
        const cache = createModelsDevCache(60_000, fetchFn);

        await cache.get();
        cache.clear();
        await cache.get();

        expect(callCount).toBe(2);
      });
    });

    describe("#when clear is called while a fetch is in-flight", () => {
      it("#then the in-flight result is not written to cache", async () => {
        let resolveFirst!: (index: ModelsDevIndex) => void;
        let callCount = 0;

        const fetchFn = (): Promise<ModelsDevIndex> => {
          callCount++;
          if (callCount === 1) {
            return new Promise<ModelsDevIndex>((resolve) => {
              resolveFirst = resolve;
            });
          }
          return Promise.resolve(nonEmptyIndex);
        };

        const cache = createModelsDevCache(60_000, fetchFn);

        const firstGet = cache.get();
        cache.clear();
        resolveFirst(nonEmptyIndex);
        await firstGet;

        const result = await cache.get();
        expect(callCount).toBe(2);
        expect(result).toBe(nonEmptyIndex);
      });
    });

    describe("#when two concurrent get calls are made", () => {
      it("#then only one fetch is issued", async () => {
        let callCount = 0;
        const fetchFn = async (): Promise<ModelsDevIndex> => {
          callCount++;
          return nonEmptyIndex;
        };
        const cache = createModelsDevCache(60_000, fetchFn);

        const [r1, r2] = await Promise.all([cache.get(), cache.get()]);

        expect(callCount).toBe(1);
        expect(r1).toBe(r2);
      });
    });
  });

  describe("#given a fetch function that returns an empty index", () => {
    describe("#when get is called", () => {
      it("#then does not cache the empty result and retries on next call", async () => {
        let callCount = 0;
        const fetchFn = async (): Promise<ModelsDevIndex> => {
          callCount++;
          return emptyIndex;
        };
        const cache = createModelsDevCache(60_000, fetchFn);

        await cache.get();
        await cache.get();

        expect(callCount).toBe(2);
      });
    });
  });
});
