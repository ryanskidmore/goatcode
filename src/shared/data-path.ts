import { join } from "node:path";
import { homedir } from "node:os";

export function getDataDir(): string {
  return process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
}

export function getCacheDir(): string {
  return process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
}

export function getOpenCodeStorageDir(): string {
  return join(getDataDir(), "opencode", "storage");
}

export function getGoatCodeCacheDir(): string {
  return join(getCacheDir(), "goatcode-sh");
}
