import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./loader";

async function withTempDir(
  prefix: string,
  run: (dir: string) => Promise<void> | void,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    await run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function restoreGoatcodeConfigDir(previousDir: string | undefined): void {
  if (previousDir === undefined) {
    delete process.env.GOATCODE_CONFIG_DIR;
  } else {
    process.env.GOATCODE_CONFIG_DIR = previousDir;
  }
}

describe("loadConfig", () => {
  test("returns null when no user or project config exists", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-user-", async (userDir) => {
        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = userDir;

        try {
          const result = await loadConfig(projectDir);
          expect(result).toBeNull();
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });

  test("returns user config when only user config exists", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-user-", async (userDir) => {
        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = userDir;
        writeFileSync(
          join(userDir, "config.ts"),
          'export default { auto_update: false, disabled_tools: ["bash"] }\n',
          "utf8",
        );

        try {
          const result = await loadConfig(projectDir);
          expect(result?.auto_update).toBe(false);
          expect(result?.disabled_tools).toEqual(["bash"]);
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });

  test("returns project config when only project config exists", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-user-", async (userDir) => {
        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = userDir;
        writeFileSync(
          join(projectDir, "goatcode.config.ts"),
          'export default { auto_update: false, disabled_hooks: ["my-hook"] }\n',
          "utf8",
        );

        try {
          const result = await loadConfig(projectDir);
          expect(result?.auto_update).toBe(false);
          expect(result?.disabled_hooks).toEqual(["my-hook"]);
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });

  test("deep merges user and project config with project taking precedence", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-user-", async (userDir) => {
        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = userDir;

        writeFileSync(
          join(userDir, "config.ts"),
          `export default {
  auto_update: true,
  disabled_tools: ["grep", "glob"],
  agents: {
    orchestrator: { model: "openai/gpt-4", temperature: 0.1 },
    explorer: { model: "anthropic/claude-3-5-sonnet" }
  }
}\n`,
          "utf8",
        );
        writeFileSync(
          join(projectDir, "goatcode.config.ts"),
          `export default {
  auto_update: false,
  disabled_tools: ["bash"],
  agents: {
    orchestrator: { temperature: 0.2 }
  }
}\n`,
          "utf8",
        );

        try {
          const result = await loadConfig(projectDir);
          expect(result?.auto_update).toBe(false);
          expect(result?.disabled_tools).toEqual(["bash"]);
          expect(result?.agents?.orchestrator?.model).toBe("openai/gpt-4");
          expect(result?.agents?.orchestrator?.temperature).toBe(0.2);
          expect(result?.agents?.explorer?.model).toBe("anthropic/claude-3-5-sonnet");
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });

  test("uses GOATCODE_CONFIG_DIR override for user config path", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-base-", async (baseDir) => {
        const overrideDir = join(baseDir, "custom-config-dir");
        mkdirSync(overrideDir);
        writeFileSync(
          join(overrideDir, "config.ts"),
          'export default { disabled_agents: ["advisor"] }\n',
          "utf8",
        );

        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = overrideDir;
        try {
          const result = await loadConfig(projectDir);
          expect(result?.disabled_agents).toEqual(["advisor"]);
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });

  test("falls through to project config when user config is invalid", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-user-", async (userDir) => {
        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = userDir;

        writeFileSync(
          join(userDir, "config.ts"),
          'export default { auto_update: "nope" }\n',
          "utf8",
        );
        writeFileSync(
          join(projectDir, "goatcode.config.ts"),
          "export default { auto_update: false }\n",
          "utf8",
        );

        try {
          const result = await loadConfig(projectDir);
          expect(result?.auto_update).toBe(false);
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });

  test("merges nested agent objects while preserving non-overridden keys", async () => {
    await withTempDir("goatcode-loader-project-", async (projectDir) => {
      await withTempDir("goatcode-loader-user-", async (userDir) => {
        const previousDir = process.env.GOATCODE_CONFIG_DIR;
        process.env.GOATCODE_CONFIG_DIR = userDir;

        writeFileSync(
          join(userDir, "config.ts"),
          `export default {
  agents: {
    orchestrator: { model: "anthropic/claude-opus-4-6", temperature: 0 }
  }
}\n`,
          "utf8",
        );
        writeFileSync(
          join(projectDir, "goatcode.config.ts"),
          `export default {
  agents: {
    orchestrator: { prompt_append: "Project specific prompt" }
  }
}\n`,
          "utf8",
        );

        try {
          const result = await loadConfig(projectDir);
          expect(result?.agents?.orchestrator?.model).toBe("anthropic/claude-opus-4-6");
          expect(result?.agents?.orchestrator?.temperature).toBe(0);
          expect(result?.agents?.orchestrator?.prompt_append).toBe("Project specific prompt");
        } finally {
          restoreGoatcodeConfigDir(previousDir);
        }
      });
    });
  });
});
