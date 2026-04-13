import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evalDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(evalDir, "..");
const scenariosPath = path.join(evalDir, "scenarios", "suite.json");
const OPENCODE_TIMEOUT_MS = 120000;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function loadScenarios() {
  return JSON.parse(fs.readFileSync(scenariosPath, "utf8"));
}

function resolveWithinRepo(relPath, label) {
  if (typeof relPath !== "string" || relPath.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  if (path.isAbsolute(relPath)) {
    throw new Error(`${label} must be relative: ${relPath}`);
  }
  const abs = path.resolve(repoDir, relPath);
  const rel = path.relative(repoDir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`${label} escapes repository root: ${relPath}`);
  }
  return abs;
}

function sanitizeString(value) {
  let out = String(value);
  const home = process.env.HOME || "";
  const replacements = [
    [repoDir, "<REPO_DIR>"],
    [evalDir, "<EVAL_DIR>"],
    [home, "<HOME>"],
  ].filter(([from]) => from && from.length > 1);
  for (const [from, to] of replacements.sort((a, b) => b[0].length - a[0].length)) {
    out = out.split(from).join(to);
  }
  return out;
}

function sanitizePaths(value) {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map((v) => sanitizePaths(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizePaths(v)]),
    );
  }
  return value;
}

function writeSetup(setup) {
  if (!setup || !Array.isArray(setup.files)) return;
  for (const file of setup.files) {
    const abs = resolveWithinRepo(file.path, "setup.files.path");
    ensureDir(path.dirname(abs));
    fs.writeFileSync(abs, file.content || "", "utf8");
  }
}

function parseJsonEvents(stdout) {
  const events = [];
  for (const line of String(stdout).split(/\n/)) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      events.push(JSON.parse(t));
    } catch {
      // ignore malformed lines
    }
  }
  return events;
}

function collectTools(events) {
  return events
    .filter((e) => e.type === "tool_use" && e.part && e.part.tool)
    .map((e) => ({
      name: String(e.part.tool),
      output: String((e.part.state && e.part.state.output) || ""),
      input: (e.part.state && e.part.state.input) || null,
    }));
}

function collectText(events) {
  return events
    .filter((e) => e.type === "text" && e.part && typeof e.part.text === "string")
    .map((e) => e.part.text)
    .join("\n")
    .trim();
}

function verify(checks, tools, text) {
  const fails = [];
  if (Array.isArray(checks.requiredToolCalls)) {
    for (const req of checks.requiredToolCalls) {
      if (!tools.some((t) => t.name === req)) fails.push(`missing required tool: ${req}`);
    }
  }
  if (Array.isArray(checks.forbiddenToolCalls)) {
    for (const deny of checks.forbiddenToolCalls) {
      if (tools.some((t) => t.name === deny)) fails.push(`forbidden tool used: ${deny}`);
    }
  }
  if (checks.requiredToolResultContains && typeof checks.requiredToolResultContains === "object") {
    for (const [tool, vals] of Object.entries(checks.requiredToolResultContains)) {
      const recs = tools.filter((t) => t.name === tool);
      if (recs.length === 0) {
        fails.push(`missing tool output: ${tool}`);
        continue;
      }
      for (const v of vals) {
        const needle = String(v).toLowerCase();
        if (!recs.some((rec) => rec.output.toLowerCase().includes(needle))) {
          fails.push(`tool ${tool} output missing: ${v}`);
        }
      }
    }
  }
  if (checks.requiredToolInputContains && typeof checks.requiredToolInputContains === "object") {
    for (const [tool, vals] of Object.entries(checks.requiredToolInputContains)) {
      const recs = tools.filter((t) => t.name === tool);
      if (recs.length === 0) {
        fails.push(`missing tool input: ${tool}`);
        continue;
      }
      for (const v of vals) {
        const needle = String(v).toLowerCase();
        if (
          !recs.some((rec) => JSON.stringify(rec.input || {}).toLowerCase().includes(needle))
        ) {
          fails.push(`tool ${tool} input missing: ${v}`);
        }
      }
    }
  }
  if (checks.requireAssistantText && !text) fails.push("assistant text missing");
  if (checks.filesystem && checks.filesystem.path) {
    const abs = resolveWithinRepo(checks.filesystem.path, "checks.filesystem.path");
    if (!fs.existsSync(abs)) {
      fails.push(`filesystem path missing: ${checks.filesystem.path}`);
    } else {
      const body = fs.readFileSync(abs, "utf8");
      for (const v of checks.filesystem.mustContain || []) {
        if (!body.includes(v)) fails.push(`filesystem missing content: ${v}`);
      }
      for (const v of checks.filesystem.mustNotContain || []) {
        if (body.includes(v)) fails.push(`filesystem contains forbidden content: ${v}`);
      }
    }
  }
  return fails;
}

export default class OpenCodeEvalProvider {
  constructor(opts) {
    this.providerId = (opts && opts.id) || "opencode-eval";
  }

  id() {
    return this.providerId;
  }

  async callApi(_prompt, context) {
    const userCfg = path.join(process.env.HOME || "", ".config", "opencode", "opencode.json");
    if (!fs.existsSync(userCfg)) {
      return {
        output: "",
        error: `Missing required OpenCode config: ${userCfg}. Configure it before running local evals.`,
      };
    }

    const scenarios = loadScenarios();
    const id = context && context.vars && context.vars.scenarioId;
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) {
      return {
        output: "",
        error: `Unknown scenarioId: ${id}`,
      };
    }

    writeSetup(scenario.setup);

    const cmd = [
      "run",
      "--format",
      "json",
      "--agent",
      "orchestrator",
      "--model",
      "openai/gpt-5.2",
      "--dangerously-skip-permissions",
      scenario.prompt,
    ];

    const run = spawnSync("opencode", cmd, {
      // Workspace isolation per-scenario is deferred for now to avoid
      // high-risk fixture/setup behavior changes in existing eval scenarios.
      cwd: repoDir,
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      timeout: OPENCODE_TIMEOUT_MS,
    });

    const events = parseJsonEvents(run.stdout || "");
    const tools = collectTools(events);
    const text = collectText(events);
    const fails = verify(scenario.checks || {}, tools, text);

    if (run.error) {
      fails.push(`opencode spawn error: ${run.error.message}`);
    }

    if (typeof run.status === "number" && run.status !== 0) {
      fails.push(`opencode exit status ${run.status}`);
    } else if (run.status === null && run.signal) {
      fails.push(`opencode terminated by signal ${run.signal}`);
    }

    const report = {
      scenarioId: scenario.id,
      status: fails.length === 0 ? "PASS" : "FAIL",
      failures: fails,
      command: `opencode ${cmd.join(" ")}`,
      exitStatus: run.status,
      signal: run.signal || null,
      stderr: String(run.stderr || ""),
      tools,
      assistantText: text,
    };

    const runDir = path.join(evalDir, "artifacts", "runs", stamp());
    ensureDir(runDir);
    const reportPath = path.join(runDir, `${scenario.id}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(sanitizePaths(report), null, 2), "utf8");

    return {
      output: `SCENARIO=${scenario.id}\nSTATUS=${report.status}\nFAILURES=${fails.length}`,
      metadata: {
        reportPath,
        report,
      },
    };
  }
}
