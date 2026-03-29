import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleUpdateCommand } from "./update";

describe("#given update command", () => {
  let stdoutWrites: string[] = [];
  let originalWrite: any;
  let originalFetch: any;
  let originalSpawn: any;

  beforeEach(() => {
    stdoutWrites = [];
    originalWrite = process.stdout.write;
    originalFetch = globalThis.fetch;
    originalSpawn = Bun.spawn;

    process.stdout.write = ((text: string) => {
      stdoutWrites.push(text);
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    globalThis.fetch = originalFetch;
    Bun.spawn = originalSpawn;
  });

  describe("#when update is available", () => {
    it("#then runs bun update goatcode-sh", async () => {
      globalThis.fetch = (() => {
        return Promise.resolve(new Response(JSON.stringify({ version: "0.2.0" })));
      }) as any;

      Bun.spawn = (() => {
        return {
          exited: Promise.resolve(0),
        };
      }) as any;

      await handleUpdateCommand();
      expect(stdoutWrites.some((w) => w.includes("Update available"))).toBe(true);
      expect(stdoutWrites.some((w) => w.includes("bun update goatcode-sh"))).toBe(true);
    });
  });

  describe("#when already up to date", () => {
    it("#then prints already up to date message", async () => {
      globalThis.fetch = (() => {
        return Promise.resolve(new Response(JSON.stringify({ version: "0.1.0" })));
      }) as any;

      await handleUpdateCommand();
      expect(stdoutWrites.some((w) => w.includes("Already up to date"))).toBe(true);
    });
  });

  describe("#when npm check fails", () => {
    it("#then reports failure gracefully", async () => {
      globalThis.fetch = (() => {
        return Promise.reject(new Error("Network error"));
      }) as any;

      await handleUpdateCommand();
      expect(stdoutWrites.some((w) => w.includes("Failed to check for updates"))).toBe(true);
    });
  });

  describe("#when bun update fails", () => {
    it("#then reports exit code", async () => {
      globalThis.fetch = (() => {
        return Promise.resolve(new Response(JSON.stringify({ version: "0.2.0" })));
      }) as any;

      Bun.spawn = (() => {
        return {
          exited: Promise.resolve(1),
        };
      }) as any;

      await handleUpdateCommand();
      expect(stdoutWrites.some((w) => w.includes("exit code 1"))).toBe(true);
    });
  });
});
