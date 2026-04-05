import { describe, expect, it } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("logDelegationDebug", () => {
  it("writes JSON-ish lines only when enabled", async () => {
    const filePath = join(tmpdir(), `goatcode-delegation-${Date.now()}.log`);
    process.env.GOATCODE_DEBUG_DELEGATION = "1";
    process.env.GOATCODE_DEBUG_DELEGATION_FILE = filePath;

    const { logDelegationDebug } = await import("./delegation-debug");
    logDelegationDebug("test.event", { title: "hello", nested: { value: 1 } });

    const content = readFileSync(filePath, "utf8");
    expect(content).toContain("test.event");
    expect(content).toContain('"title":"hello"');
    expect(content).toContain('"nested":{"value":1}');

    delete process.env.GOATCODE_DEBUG_DELEGATION;
    delete process.env.GOATCODE_DEBUG_DELEGATION_FILE;
    rmSync(filePath, { force: true });
  });
});
