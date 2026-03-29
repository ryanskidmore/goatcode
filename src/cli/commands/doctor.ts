import { existsSync } from "node:fs"
import { join } from "node:path"
import { loadConfig } from "../../config/loader"
import { resolveLegacyProjectConfigPath, resolveProjectConfigPath, resolveUserConfigDir } from "../../config/paths"
import { log } from "../../shared/logger"

export type CheckStatus = "pass" | "fail"

export interface CheckResult {
  name: string
  status: CheckStatus
  detail: string
}

export interface DoctorResult {
  checks: CheckResult[]
  exitCode: number
}

async function spawnCommand(cmd: string, args: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" })
    const output = await new Response(proc.stdout).text()
    const exitCode = await proc.exited
    if (exitCode !== 0) return null
    return output.trim()
  } catch {
    return null
  }
}

export async function checkTypeScript(): Promise<CheckResult> {
  const output = await spawnCommand("tsc", ["--version"])
  if (output === null) {
    return { name: "TypeScript installed", status: "fail", detail: "tsc not found in PATH" }
  }
  return { name: "TypeScript installed", status: "pass", detail: output }
}

export async function checkBun(): Promise<CheckResult> {
  const output = await spawnCommand("bun", ["--version"])
  if (output === null) {
    return { name: "Bun installed", status: "fail", detail: "bun not found in PATH" }
  }
  return { name: "Bun installed", status: "pass", detail: output }
}

export function getConfigLocations(cwd: string): {
  userConfigPath: string
  projectConfigPath: string
  legacyProjectConfigPath: string
} {
  return {
    userConfigPath: join(resolveUserConfigDir(), "config.ts"),
    projectConfigPath: resolveProjectConfigPath(cwd),
    legacyProjectConfigPath: resolveLegacyProjectConfigPath(cwd),
  }
}

export function checkConfigExists(cwd: string): CheckResult {
  const { userConfigPath, projectConfigPath, legacyProjectConfigPath } = getConfigLocations(cwd)
  const userExists = existsSync(userConfigPath)
  const projectExists = existsSync(projectConfigPath)
  const legacyProjectExists = existsSync(legacyProjectConfigPath)

  const detail = `user=${userConfigPath} (${userExists ? "found" : "missing"}), project=${projectConfigPath} (${projectExists ? "found" : "missing"}), legacy=${legacyProjectConfigPath} (${legacyProjectExists ? "found" : "missing"})`
  if (!userExists && !projectExists && !legacyProjectExists) {
    return { name: "Config locations", status: "fail", detail }
  }

  return { name: "Config locations", status: "pass", detail }
}

export async function checkConfigValid(cwd: string): Promise<CheckResult> {
  const config = await loadConfig(cwd)
  if (config === null) {
    return {
      name: "Config is valid",
      status: "fail",
      detail: "No valid user or project config found",
    }
  }

  return { name: "Config is valid", status: "pass", detail: "resolved and validated" }
}

export function formatCheckLine(result: CheckResult): string {
  const tag = result.status === "pass" ? "[PASS]" : "[FAIL]"
  return `${tag} ${result.name} (${result.detail})`
}

export async function runDoctor(cwd: string): Promise<DoctorResult> {
  log("doctor: running health checks")

  const [tsCheck, bunCheck, configExistsCheck, configValidCheck] = await Promise.all([
    checkTypeScript(),
    checkBun(),
    Promise.resolve(checkConfigExists(cwd)),
    checkConfigValid(cwd),
  ])

  const checks = [tsCheck, bunCheck, configExistsCheck, configValidCheck]
  const exitCode = checks.some((c) => c.status === "fail") ? 1 : 0

  log("doctor: checks complete", { passed: checks.filter((c) => c.status === "pass").length, total: checks.length })

  return { checks, exitCode }
}

export function printDoctorResult(result: DoctorResult): void {
  for (const check of result.checks) {
    process.stdout.write(formatCheckLine(check) + "\n")
  }
}
