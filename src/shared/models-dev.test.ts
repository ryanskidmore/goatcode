import { describe, expect, it } from "bun:test"
import {
  buildModelsDevIndex,
  resolveWithModelsDevData,
  type ModelsDevProvider,
} from "./models-dev"

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
}

describe("models-dev index", () => {
  describe("#given fixture provider data", () => {
    const index = buildModelsDevIndex(fixture)

    describe("#when building platform to canonical map", () => {
      it("#then maps direct provider models to canonical ids", () => {
        expect(index.byPlatformModel.get("anthropic/claude-opus-4-6")).toBe("anthropic/claude-opus-4-6")
      })

      it("#then maps opencode models using provider npm mapping", () => {
        expect(index.byPlatformModel.get("opencode/claude-opus-4-6")).toBe("anthropic/claude-opus-4-6")
      })

      it("#then maps pass-through provider models as-is", () => {
        expect(index.byPlatformModel.get("cloudflare-ai-gateway/anthropic/claude-3.5-sonnet")).toBe("anthropic/claude-3.5-sonnet")
      })

      it("#then skips models that cannot be canonically mapped", () => {
        expect(index.byPlatformModel.get("opencode/unknown-no-provider")).toBeUndefined()
      })
    })

    describe("#when building reverse canonical map", () => {
      it("#then tracks all platform models that map to same canonical id", () => {
        expect(index.byCanonical.get("anthropic/claude-opus-4-6")).toEqual(
          new Set(["anthropic/claude-opus-4-6", "opencode/claude-opus-4-6"]),
        )
      })
    })
  })
})

describe("resolveWithModelsDevData", () => {
  describe("#given a built models.dev index", () => {
    const index = buildModelsDevIndex(fixture)

    describe("#when resolving direct provider model ids", () => {
      it("#then returns canonical ids", () => {
        expect(resolveWithModelsDevData("anthropic/claude-opus-4-6", index)).toBe("anthropic/claude-opus-4-6")
      })
    })

    describe("#when resolving opencode model ids", () => {
      it("#then returns canonical ids using model provider metadata", () => {
        expect(resolveWithModelsDevData("opencode/claude-opus-4-6", index)).toBe("anthropic/claude-opus-4-6")
      })
    })

    describe("#when resolving pass-through provider model ids", () => {
      it("#then returns canonical ids from embedded prefixes", () => {
        expect(resolveWithModelsDevData("cloudflare-ai-gateway/anthropic/claude-3.5-sonnet", index)).toBe(
          "anthropic/claude-3.5-sonnet",
        )
      })
    })

    describe("#when resolving unknown model ids", () => {
      it("#then returns undefined", () => {
        expect(resolveWithModelsDevData("opencode/does-not-exist", index)).toBeUndefined()
      })
    })

    describe("#when resolving opencode model without provider metadata", () => {
      it("#then returns undefined", () => {
        expect(resolveWithModelsDevData("opencode/unknown-no-provider", index)).toBeUndefined()
      })
    })
  })
})
