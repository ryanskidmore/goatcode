import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LOG_FILE = join(tmpdir(), "goatcode.log");
const BUFFER_SIZE_LIMIT = 50;
const FLUSH_INTERVAL_MS = 500;

let buffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (buffer.length === 0) return;
  const data = buffer.join("");
  buffer = [];
  try {
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
    const logEntry = `[${timestamp}] ${message} ${data !== undefined ? JSON.stringify(data) : ""}\n`;
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
