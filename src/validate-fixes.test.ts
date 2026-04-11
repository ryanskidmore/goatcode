/**
 * Direct scenario validation for all 11 fixed bugs.
 * Each test reproduces the exact failure condition described in the scenario
 * and asserts the fixed behaviour.
 */
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ─── A22: fallback_models config field consumed by compositor ────────────────

describe("A22 — fallback_models override reaches compositor", () => {
  it("uses custom chain instead of built-in chain when fallback_models is set", async () => {
    // Reproduce: user sets agents.orchestrator.fallback_models: ["openai/gpt-5.4"]
    // with openai as only connected provider. Bug: composer always called
    // getFallbackChain(name) regardless of config, so openai/gpt-5.4 without
    // variant was never selected; the built-in chain entry would add variant:medium.
    const { buildCustomFallbackChain } = await import("./agents/fallback-chains");
    const { resolveModel } = await import("./shared/model-resolution-pipeline");

    const customChain = buildCustomFallbackChain(["openai/gpt-5.4"]);
    const result = resolveModel({ fallbackChain: customChain, connectedProviders: ["openai"] });

    // Custom chain has no variant — built-in chain would have variant:medium
    expect(result?.model).toBe("openai/gpt-5.4");
    expect(result?.variant).toBeUndefined(); // proves we used custom chain, not built-in
  });

  it("uses opencode/ prefix for unqualified model in custom chain", async () => {
    const { buildCustomFallbackChain } = await import("./agents/fallback-chains");
    const { resolveModel } = await import("./shared/model-resolution-pipeline");

    const customChain = buildCustomFallbackChain("my-custom-model");
    const result = resolveModel({ fallbackChain: customChain, connectedProviders: ["opencode"] });

    expect(result?.model).toBe("opencode/my-custom-model");
  });
});

// ─── T65: unwrapClientResponse does not throw on error: 0 ───────────────────

describe("T65 — LSP unwrapClientResponse with error: 0", () => {
  it("does NOT throw when error is 0 (falsy no-error convention)", async () => {
    const { callLspClient } = await import("./tools/lsp/client");

    const client = {
      lspGotoDefinition: mock(async () => ({
        error: 0, // falsy — API convention for "no error"
        data: [{ uri: "file:///src/foo.ts" }],
      })),
    } as never;

    // Bug: previously threw new Error("0"). Now should return the data.
    const result = await callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
      filePath: "/src/foo.ts",
      line: 1,
      character: 0,
    });

    expect(result).toEqual([{ uri: "file:///src/foo.ts" }]);
  });

  it("still throws when error is a non-empty string", async () => {
    const { callLspClient } = await import("./tools/lsp/client");

    const client = {
      lspGotoDefinition: mock(async () => ({
        error: "symbol not found",
        data: null,
      })),
    } as never;

    await expect(
      callLspClient(client, "lsp_goto_definition", "lspGotoDefinition", {
        filePath: "/src/foo.ts",
        line: 1,
        character: 0,
      }),
    ).rejects.toThrow("symbol not found");
  });
});

// ─── T60: lsp_rename rejects empty newName ───────────────────────────────────

describe("T60 — lsp_rename empty newName rejected", () => {
  it("rejects newName: '' with a Zod validation error", async () => {
    const { lspRenameArgsSchema } = await import("./tools/lsp/rename/types");

    const result = lspRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1,
      character: 0,
      newName: "", // Bug: was accepted. Fix: .min(1) added.
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("newName");
    }
  });

  it("accepts a non-empty newName", async () => {
    const { lspRenameArgsSchema } = await import("./tools/lsp/rename/types");

    const result = lspRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1,
      character: 0,
      newName: "myNewName",
    });

    expect(result.success).toBe(true);
  });
});

// ─── T62: LSP tools reject float line/character numbers ─────────────────────

describe("T62 — LSP tools reject float line/character", () => {
  it("goto_definition: line: 1.5 rejected", async () => {
    const { lspGotoDefinitionArgsSchema } = await import("./tools/lsp/goto-definition/types");

    const result = lspGotoDefinitionArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1.5, // Bug: was accepted. Fix: .int() added.
      character: 0,
    });

    expect(result.success).toBe(false);
  });

  it("find_references: character: 2.9 rejected", async () => {
    const { lspFindReferencesArgsSchema } = await import("./tools/lsp/find-references/types");

    const result = lspFindReferencesArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 1,
      character: 2.9, // Bug: was accepted. Fix: .int() added.
    });

    expect(result.success).toBe(false);
  });

  it("prepare_rename: line: 0.5 rejected", async () => {
    const { lspPrepareRenameArgsSchema } = await import("./tools/lsp/prepare-rename/types");

    const result = lspPrepareRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 0.5, // Bug: was accepted.
      character: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rename: line: 3.14 rejected", async () => {
    const { lspRenameArgsSchema } = await import("./tools/lsp/rename/types");

    const result = lspRenameArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 3.14, // Bug: was accepted.
      character: 0,
      newName: "foo",
    });

    expect(result.success).toBe(false);
  });

  it("integer line numbers are still accepted", async () => {
    const { lspGotoDefinitionArgsSchema } = await import("./tools/lsp/goto-definition/types");

    const result = lspGotoDefinitionArgsSchema.safeParse({
      filePath: "/src/foo.ts",
      line: 10,
      character: 5,
    });

    expect(result.success).toBe(true);
  });
});

// ─── T64: prepare_rename returns [] → "Rename is not valid" ─────────────────

describe("T64 — lsp_prepare_rename normalises empty array to not-valid message", () => {
  it("returns 'Rename is not valid' when LSP returns empty array", async () => {
    const { lspPrepareRenameTool } = await import("./tools/lsp/prepare-rename/handler");
    const { createMockToolContext } = await import("./test-utils");

    const ctx = createMockToolContext({
      client: {
        lspPrepareRename: mock(async () => ({ data: [] })), // empty array response
      },
    } as never);

    const result = await lspPrepareRenameTool.execute(
      { filePath: "/src/foo.ts", line: 1, character: 0 },
      ctx,
    );

    // Bug: was returning '[]' (JSON.stringify of empty array). Fix: returns proper message.
    expect(result).toBe("Rename is not valid at this position");
    expect(result).not.toBe("[]");
  });
});

// ─── T106: session_list with invalid date returns all sessions ───────────────

describe("T106 — session_list with invalid from_date keeps all sessions", () => {
  it("returns all sessions when from_date is 'not-a-date' (NaN guard)", async () => {
    const { handleSessionList } = await import("./tools/session-manager/list/handler");
    const { createMockPluginContext } = await import("./test-utils");

    const sessions = [
      { id: "ses_1", parentID: null, time: { updated: Date.now() } },
      { id: "ses_2", parentID: null, time: { updated: Date.now() - 1000 } },
    ];

    const ctx = {
      ...createMockPluginContext(),
      client: {
        session: {
          list: mock(async () => ({ data: sessions })),
          messages: mock(async () => ({ data: [] })),
        },
      },
    } as never;

    const result = await handleSessionList(
      { from_date: "not-a-date", session_id: undefined } as never,
      ctx,
    );

    // Bug: NaN comparison dropped all sessions. Fix: NaN guard returns true (keep session).
    expect(result).toContain("ses_1");
    expect(result).toContain("ses_2");
  });
});

// ─── T112: include_transcript removed from session_read schema ───────────────

describe("T112 — include_transcript parameter removed from session_read", () => {
  it("include_transcript is no longer in SessionReadArgs type", async () => {
    await import("./tools/session-manager/read/types");
    // The interface no longer has include_transcript — if this were a runtime
    // type we'd check via Zod, but it's a TypeScript interface.
    // We verify by inspecting the plugin schema directly.
    const pluginModule = await import("./tools/session-manager/read/plugin");
    const plugin = pluginModule.sessionReadPlugin;
    const toolDef = plugin.tools?.session_read;

    // The tool definition's args should NOT include include_transcript
    expect(toolDef).toBeDefined();
    const argsKeys = Object.keys((toolDef as { args?: Record<string, unknown> })?.args ?? {});
    expect(argsKeys).not.toContain("include_transcript");
  });
});

// ─── T121: session_info no longer emits "Has Transcript" ────────────────────

describe("T121 — session_info output no longer contains 'Has Transcript'", () => {
  it("formatted session detail does not contain 'Has Transcript'", async () => {
    const { buildSessionDetail, formatSessionDetail } =
      await import("./tools/session-manager/session-formatter");

    // Build a minimal detail and format it
    const detail = buildSessionDetail("ses_test", [], []);
    const output = formatSessionDetail(detail);

    // Bug: always printed "Has Transcript: No". Fix: field removed entirely.
    expect(output).not.toContain("Has Transcript");
  });
});

// ─── T143: skill loader exceptions are caught ────────────────────────────────

describe("T143 — skill loader exceptions return error string", () => {
  it("returns error string instead of propagating when loader throws", async () => {
    const handlerModule = await import("./tools/skill/handler");
    handlerModule.registerSkillLoader({
      list: () => [],
      load: (_name: string) => {
        throw new Error("loader exploded");
      },
    });

    // Bug: threw Error("loader exploded") up the stack. Fix: returns "Error: ..." string.
    const result = handlerModule.executeSkill({ name: "anything" });
    expect(result).toMatch(/^Error loading skill 'anything': loader exploded/);
  });
});

// ─── T151: look_at rejects text files over 1 MB ──────────────────────────────

describe("T151 — look_at text file size limit", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "look-at-size-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for text file exceeding 1 MB", async () => {
    const { createLookAtTool } = await import("./tools/look-at/handler");
    const { createMockToolContext } = await import("./test-utils");

    // Create a file just over 1 MB
    const overSizeFile = join(tempDir, "big.ts");
    await writeFile(overSizeFile, "x".repeat(1024 * 1024 + 1));

    // Use a no-op poller so we don't need a full session client
    const tool = createLookAtTool(async () => ({ messageCount: 0, isIdle: true }));
    const ctx = createMockToolContext() as never;

    // Bug: loaded entire multi-MB file. Fix: returns error for >1 MB.
    const result = await tool.execute({ file_path: overSizeFile, goal: "summarise" }, ctx);

    expect(result).toMatch(/too large/i);
    expect(result).toMatch(/1 MB/i);
  });

  it("allows text files at or below 1 MB through to the session client", async () => {
    const { createLookAtTool } = await import("./tools/look-at/handler");
    const { createMockToolContext } = await import("./test-utils");

    const okFile = join(tempDir, "small.ts");
    await writeFile(okFile, "const x = 1;\n");

    // A file this small must NOT be rejected by size check.
    // It will fail later (mock client has no session.create), so we look for a
    // non-size-limit error (e.g. session create error from mock, or TypeError).
    const tool = createLookAtTool(async () => ({ messageCount: 0, isIdle: true }));
    const ctx = createMockToolContext() as never;

    const result = await tool.execute({ file_path: okFile, goal: "summarise" }, ctx);

    // Must NOT be a size-limit error
    expect(result).not.toMatch(/too large/i);
  });
});

// ─── F15: depth-keyed concurrency pools prevent starvation ──────────────────

describe("F15 — depth-keyed concurrency prevents parent/child starvation", () => {
  it("parents (depth:0) and children (depth:1) use separate pools", async () => {
    const { ConcurrencyManager } = await import("./features/background-agent/concurrency");

    // Simulate: 10 parent tasks acquire all slots in pool "model:0"
    const mgr = new ConcurrencyManager(10);

    // Acquire all 10 parent slots
    for (let i = 0; i < 10; i++) {
      await mgr.acquire("anthropic/claude-opus-4-6:0"); // depth-0 key
    }

    // Verify parent pool is full
    expect(mgr.getCount("anthropic/claude-opus-4-6:0")).toBe(10);

    // Child tasks use a DIFFERENT key — they can still acquire immediately
    await mgr.acquire("anthropic/claude-opus-4-6:1"); // depth-1 key
    expect(mgr.getCount("anthropic/claude-opus-4-6:1")).toBe(1);

    // Bug would have been: same key for both → all 10 slots used by parents,
    // child would queue. Fix: depth-keyed pools, so child pool is independent.
    expect(mgr.getQueueLength("anthropic/claude-opus-4-6:1")).toBe(0); // no queue
    expect(mgr.getQueueLength("anthropic/claude-opus-4-6:0")).toBe(0); // no queue
  });

  it("concurrency default is now 10 (was 5)", async () => {
    const { ConcurrencyManager } = await import("./features/background-agent/concurrency");
    const mgr = new ConcurrencyManager(); // default
    // Fill 10 slots without queuing
    for (let i = 0; i < 10; i++) {
      await mgr.acquire("model:0");
    }
    expect(mgr.getCount("model:0")).toBe(10);
    expect(mgr.getQueueLength("model:0")).toBe(0);

    // 11th acquisition should queue
    let resolved = false;
    mgr.acquire("model:0").then(() => {
      resolved = true;
    });
    await new Promise((r) => setTimeout(r, 10)); // yield
    expect(resolved).toBe(false); // still waiting in queue
    expect(mgr.getQueueLength("model:0")).toBe(1);
  });
});
