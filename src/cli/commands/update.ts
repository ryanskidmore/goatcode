import { log } from "../../shared/logger"
import { checkForUpdate } from "../../features/auto-update/update-checker"
import packageJson from "../../../package.json" with { type: "json" }

const VERSION = packageJson.version
const PACKAGE_NAME = packageJson.name

export async function handleUpdateCommand(): Promise<void> {
  try {
    log("cli: update command invoked")

    const result = await checkForUpdate(VERSION)

    if (result.error) {
      process.stdout.write("Failed to check for updates. Please try again later.\n")
      return
    }

    if (!result.updateAvailable) {
      process.stdout.write(`Already up to date (v${result.current})\n`)
      return
    }

    process.stdout.write(
      `Update available: v${result.current} -> v${result.latest}\n`
    )
    process.stdout.write(`Running: bun update ${PACKAGE_NAME}\n`)

    const proc = Bun.spawn(["bun", "update", PACKAGE_NAME], {
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
