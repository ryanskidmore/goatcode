import { existsSync } from "node:fs"
import { join } from "node:path"
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

export function checkConfigExists(cwd: string): CheckResult {
  const configPath = join(cwd, "goatcode.config.ts")
  if (!existsSync(configPath)) {
    return { name: "goatcode.config.ts exists", status: "fail", detail: "goatcode.config.ts not found" }
  }
  return { name: "goatcode.config.ts exists", status: "pass", detail: configPath }
}

export async function checkConfigValid(cwd: string): Promise<CheckResult> {
  const configPath = join(cwd, "goatcode.config.ts")
  if (!existsSync(configPath)) {
    return { name: "Config is valid", status: "fail", detail: "goatcode.config.ts not found, cannot validate" }
  }
  try {
    await import(configPath)
    return { name: "Config is valid", status: "pass", detail: "imported without errors" }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { name: "Config is valid", status: "fail", detail: message }
  }
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
