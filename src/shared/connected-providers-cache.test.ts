import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readConnectedProviders,
  writeConnectedProviders,
  hasConnectedProvidersCache,
  readProviderModels,
  writeProviderModels,
  resetConnectedProvidersCache,
} from "./connected-providers-cache";

const TEST_CACHE_DIR = join(tmpdir(), `goatcode-cache-test-${Date.now()}`);

describe("connected-providers-cache", () => {
  beforeEach(() => {
    resetConnectedProvidersCache();
    // Override the cache dir by setting XDG_CACHE_HOME
    process.env.XDG_CACHE_HOME = join(TEST_CACHE_DIR, "xdg-cache");
    const cacheDir = join(TEST_CACHE_DIR, "xdg-cache", "goatcode-sh");
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true });
    }
  });

  afterEach(() => {
    delete process.env.XDG_CACHE_HOME;
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  describe("readConnectedProviders", () => {
    it("returns null when no cache file exists (first run)", () => {
      expect(readConnectedProviders()).toBeNull();
    });

    it("returns cached providers after write", () => {
      writeConnectedProviders(["opencode", "openai"]);
      resetConnectedProvidersCache(); // clear memory cache to test disk read
      expect(readConnectedProviders()).toEqual(["opencode", "openai"]);
    });

    it("caches in memory after first read", () => {
      writeConnectedProviders(["opencode"]);
      resetConnectedProvidersCache();
      const first = readConnectedProviders();
      const second = readConnectedProviders();
      expect(first).toEqual(["opencode"]);
      expect(second).toBe(first); // same reference — memory cached
    });
  });

  describe("hasConnectedProvidersCache", () => {
    it("returns false when no cache exists", () => {
      expect(hasConnectedProvidersCache()).toBe(false);
    });

    it("returns true after writing", () => {
      writeConnectedProviders(["opencode"]);
      expect(hasConnectedProvidersCache()).toBe(true);
    });
  });

  describe("writeConnectedProviders", () => {
    it("creates cache directory if missing", () => {
      writeConnectedProviders(["openai"]);
      const cacheDir = join(TEST_CACHE_DIR, "xdg-cache", "goatcode-sh");
      expect(existsSync(cacheDir)).toBe(true);
    });

    it("updates in-memory cache immediately", () => {
      resetConnectedProvidersCache();
      writeConnectedProviders(["opencode"]);
      // No reset — should read from memory
      expect(readConnectedProviders()).toEqual(["opencode"]);
    });
  });

  describe("readProviderModels", () => {
    it("returns null when no cache exists", () => {
      expect(readProviderModels()).toBeNull();
    });

    it("returns cached data after write", () => {
      writeProviderModels({
        models: { opencode: ["claude-opus-4-6", "gpt-5.4"] },
        connected: ["opencode"],
      });
      resetConnectedProvidersCache();

      const result = readProviderModels();
      expect(result?.connected).toEqual(["opencode"]);
      expect(result?.models.opencode).toEqual(["claude-opus-4-6", "gpt-5.4"]);
      expect(result?.updatedAt).toBeDefined();
    });
  });
});
