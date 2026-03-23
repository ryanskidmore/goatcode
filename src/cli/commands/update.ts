import { log } from "../../shared/logger"
import { checkForUpdate } from "../../features/auto-update/update-checker"
import packageJson from "../../../package.json" with { type: "json" }

const VERSION = packageJson.version

export async function handleUpdateCommand(): Promise<void> {
  try {
    log("cli: update command invoked")

    const result = await checkForUpdate(VERSION)

    if (!result.latestVersion) {
      process.stdout.write("Failed to check for updates. Please try again later.\n")
      return
    }

    if (!result.needsUpdate) {
      process.stdout.write(`Already up to date (v${result.currentVersion})\n`)
      return
    }

    process.stdout.write(
      `Update available: v${result.currentVersion} -> v${result.latestVersion}\n`
    )
    process.stdout.write("Running: bun update ochead\n")

    const proc = Bun.spawn(["bun", "update", "ochead"], {
      stdio: ["inherit", "inherit", "inherit"],
    })

    const exitCode = await proc.exited

    if (exitCode === 0) {
      process.stdout.write("Update completed successfully!\n")
      log("cli: update command completed successfully")
    } else {
      process.stdout.write(`Update failed with exit code ${exitCode}\n`)
      log("cli: update command failed", { exitCode })
    }
  } catch (error) {
    log("cli: update command error", error)
    process.stdout.write("Error during update: " + String(error) + "\n")
    process.exit(1)
  }
}
