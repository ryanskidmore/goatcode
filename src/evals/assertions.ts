import type { AssertionResult } from "./types"

function result(name: string, passed: boolean, detail: string): AssertionResult {
  return { name, passed, detail }
}

export function containsText(output: string, expected: string): AssertionResult {
  const passed = output.includes(expected)
  return result("containsText", passed, passed ? `Found expected text: ${expected}` : `Missing expected text: ${expected}`)
}

export function notContainsText(output: string, forbidden: string): AssertionResult {
  const passed = !output.includes(forbidden)
  return result("notContainsText", passed, passed ? `Forbidden text not present: ${forbidden}` : `Found forbidden text: ${forbidden}`)
}

export function matchesPattern(output: string, pattern: RegExp): AssertionResult {
  const passed = pattern.test(output)
  return result("matchesPattern", passed, passed ? `Pattern matched: ${pattern}` : `Pattern did not match: ${pattern}`)
}

export function hasMinLength(output: string, min: number): AssertionResult {
  const passed = output.length >= min
  return result("hasMinLength", passed, passed ? `Output length ${output.length} >= ${min}` : `Output length ${output.length} < ${min}`)
}

export function hasMaxLength(output: string, max: number): AssertionResult {
  const passed = output.length <= max
  return result("hasMaxLength", passed, passed ? `Output length ${output.length} <= ${max}` : `Output length ${output.length} > ${max}`)
}

export function mentionsTools(output: string, tools: string[]): AssertionResult {
  const missing = tools.filter((tool) => !new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(output))
  const passed = missing.length === 0
  return result("mentionsTools", passed, passed ? `All tools mentioned: ${tools.join(", ")}` : `Missing tool mentions: ${missing.join(", ")}`)
}

export function isStructured(output: string): AssertionResult {
  const headingCount = (output.match(/^##?\s+/gm) ?? []).length
  const passed = headingCount >= 2
  return result("isStructured", passed, passed ? `Detected ${headingCount} markdown sections` : "Expected at least 2 markdown sections")
}
