import { appendFileSync, mkdirSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";

import { getGoatCodeLogDir } from "./data-path";

const LOG_DIR = getGoatCodeLogDir();
const LOG_FILE = join(LOG_DIR, "debug.log");
const BUFFER_SIZE_LIMIT = 50;
const FLUSH_INTERVAL_MS = 500;
const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROTATED_FILES = 3;

let dirEnsured = false;

let buffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function ensureLogDir(): void {
  if (dirEnsured) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    dirEnsured = true;
  } catch {
    // Fall through — flush will fail silently if dir doesn't exist
  }
}

function rotateIfNeeded(incomingBytes = 0): void {
  try {
    const stats = statSync(LOG_FILE);
    if (stats.size + incomingBytes < MAX_LOG_SIZE_BYTES) return;

    // Shift existing rotated files: debug.log.2 → debug.log.3, etc.
    for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
      try {
        renameSync(join(LOG_DIR, `debug.log.${i}`), join(LOG_DIR, `debug.log.${i + 1}`));
      } catch {
        // Target may not exist yet — that's fine
      }
    }
    renameSync(LOG_FILE, join(LOG_DIR, "debug.log.1"));
  } catch {
    // File may not exist yet or rotation failed — non-fatal
  }
}

function flush(): void {
  if (buffer.length === 0) return;
  const data = buffer.join("");
  const dataBytes = Buffer.byteLength(data);
  buffer = [];
  try {
    ensureLogDir();
    rotateIfNeeded(dataBytes);
    appendFileSync(LOG_FILE, data);
  } catch {
    // Ignore log write failures - never crash the plugin for logging
  }
}

// Flush buffer on process exit to avoid losing buffered log entries
process.on("exit", flush);
process.on("beforeExit", flush);

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/** Write a structured log entry to the goatcode log file. */
export function log(message: string, data?: unknown): void {
  try {
    const timestamp = new Date().toISOString();
    const serialized =
      data !== undefined
        ? JSON.stringify(data, (_key, value) => {
            if (value instanceof Error) {
              return { message: value.message, name: value.name, stack: value.stack };
            }
            return value;
          })
        : "";
    const logEntry = `[${timestamp}] ${message} ${serialized}\n`;
    buffer.push(logEntry);
    if (buffer.length >= BUFFER_SIZE_LIMIT) {
      flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // Never throw from logger
  }
}

/** Returns the absolute path to the log file. */
export function getLogFilePath(): string {
  return LOG_FILE;
}
