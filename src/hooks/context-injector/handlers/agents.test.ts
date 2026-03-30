import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAgentsInjectorHandler } from "./agents";

const tempDirectories: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "goatcode-agents-"));
  tempDirectories.push(workspace);
  return workspace;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("createAgentsInjectorHandler", () => {
  describe("#given a read tool with AGENTS.md in parent directories", () => {
    describe("#when the handler processes the output", () => {
      it("#then it appends AGENTS.md content to the output", async () => {
        const workspace = createWorkspace();
        const subDir = join(workspace, "src");
        mkdirSync(subDir, { recursive: true });
        writeFileSync(join(workspace, "AGENTS.md"), "root-agent-rules");
        writeFileSync(join(subDir, "file.ts"), "export {}");

        const handler = createAgentsInjectorHandler(workspace);
        const output = { title: join(subDir, "file.ts"), output: "original-content" };

        await handler({ tool: "read" }, output);

        expect(output.output).toContain("root-agent-rules");
        expect(output.output).toContain("[Directory Context:");
      });
    });
  });

  describe("#given a non-read tool", () => {
    describe("#when the handler processes the output", () => {
      it("#then it does not modify the output", async () => {
        const workspace = createWorkspace();
        writeFileSync(join(workspace, "AGENTS.md"), "root-agent-rules");

        const handler = createAgentsInjectorHandler(workspace);
        const output = { title: join(workspace, "file.ts"), output: "original-content" };

        await handler({ tool: "bash" }, output);

        expect(output.output).toBe("original-content");
      });
    });
  });

  describe("#given a read tool with no AGENTS.md files", () => {
    describe("#when the handler processes the output", () => {
      it("#then it leaves the output unchanged", async () => {
        const workspace = createWorkspace();
        const subDir = join(workspace, "src");
        mkdirSync(subDir, { recursive: true });
        writeFileSync(join(subDir, "file.ts"), "export {}");

        const handler = createAgentsInjectorHandler(workspace);
        const output = { title: join(subDir, "file.ts"), output: "original-content" };

        await handler({ tool: "read" }, output);

        expect(output.output).toBe("original-content");
      });
    });
  });

  describe("#given a read tool with no title", () => {
    describe("#when the handler processes the output", () => {
      it("#then it does not modify the output", async () => {
        const workspace = createWorkspace();

        const handler = createAgentsInjectorHandler(workspace);
        const output = { output: "original-content" };

        await handler({ tool: "read" }, output);

        expect(output.output).toBe("original-content");
      });
    });
  });

  describe("#given repeated reads from the same AGENTS.md scope", () => {
    describe("#when the same AGENTS.md would be injected twice", () => {
      it("#then injects full content once and a back-reference on subsequent reads", async () => {
        const workspace = createWorkspace();
        const subDir = join(workspace, "src");
        mkdirSync(subDir, { recursive: true });
        writeFileSync(join(workspace, "AGENTS.md"), "root-agent-rules");
        writeFileSync(join(subDir, "file1.ts"), "export {}");
        writeFileSync(join(subDir, "file2.ts"), "export {}");

        const handler = createAgentsInjectorHandler(workspace);

        // First read — full content injected
        const output1 = { title: join(subDir, "file1.ts"), output: "content1" };
        await handler({ tool: "read" }, output1);
        expect(output1.output).toContain("root-agent-rules");
        expect(output1.output).not.toContain("see full AGENTS.md injected above");

        // Second read — back-reference only, no full content duplication
        const output2 = { title: join(subDir, "file2.ts"), output: "content2" };
        await handler({ tool: "read" }, output2);
        expect(output2.output).toContain("see full AGENTS.md injected above");
        // Should NOT contain the full content again
        expect(output2.output).not.toContain("root-agent-rules");
      });
    });
  });
});
