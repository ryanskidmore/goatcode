import { log } from "../../shared/logger";

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latest: string;
  current: string;
  error: boolean;
}

export async function checkForUpdate(
  currentVersion: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<UpdateCheckResult> {
  try {
    const response = await fetchFn("https://registry.npmjs.org/goatcode-sh/latest");
    if (!response.ok) {
      log("[auto-update-checker] Failed to fetch npm registry", { status: response.status });
      return {
        updateAvailable: false,
        latest: currentVersion,
        current: currentVersion,
        error: true,
      };
    }

    const data = (await response.json()) as { version?: string };
    const latestVersion = data.version ?? currentVersion;

    const updateAvailable = isNewerVersion(latestVersion, currentVersion);

    return {
      updateAvailable,
      latest: latestVersion,
      current: currentVersion,
      error: false,
    };
  } catch (error) {
    log("[auto-update-checker] Error checking for update", { error });
    return {
      updateAvailable: false,
      latest: currentVersion,
      current: currentVersion,
      error: true,
    };
  }
}

function isNewerVersion(latest: string, current: string): boolean {
  const parseVersion = (v: string) =>
    v
      .split("-")[0]
      .split(".")
      .map((p) => parseInt(p, 10));
  const latestParts = parseVersion(latest);
  const currentParts = parseVersion(current);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] ?? 0;
    const currentPart = currentParts[i] ?? 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}
