import { log } from "../../shared/logger"

export interface UpdateCheckResult {
  updateAvailable: boolean
  latest: string
  current: string
}

export async function checkForUpdate(
  currentVersion: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<UpdateCheckResult> {
  try {
    const response = await fetchFn("https://registry.npmjs.org/ochead/latest")
    if (!response.ok) {
      log("[auto-update-checker] Failed to fetch npm registry", { status: response.status })
      return {
        updateAvailable: false,
        latest: currentVersion,
        current: currentVersion,
      }
    }

    const data = (await response.json()) as { version?: string }
    const latestVersion = data.version ?? currentVersion

    const updateAvailable = isNewerVersion(latestVersion, currentVersion)

    return {
      updateAvailable,
      latest: latestVersion,
      current: currentVersion,
    }
  } catch (error) {
    log("[auto-update-checker] Error checking for update", { error })
    return {
      updateAvailable: false,
      latest: currentVersion,
      current: currentVersion,
    }
  }
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split(".").map((p) => parseInt(p, 10))
  const currentParts = current.split(".").map((p) => parseInt(p, 10))

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] ?? 0
    const currentPart = currentParts[i] ?? 0

    if (latestPart > currentPart) return true
    if (latestPart < currentPart) return false
  }

  return false
}
