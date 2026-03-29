import { log } from "../shared/logger"
import type { PluginDefinition } from "../types/plugin"

type ContributionKey = "agents" | "tools" | "hooks"
type ConflictMode = "replace" | "append"

type AggregateResult<K extends ContributionKey, T> = K extends "hooks"
  ? Map<string, T[]>
  : Record<string, T>

interface AggregateOptions {
  disabled?: string[]
  onConflict: ConflictMode
}

function describeContribution(key: ContributionKey): {
  prefix: string
  singular: string
  plural: string
} {
  if (key === "agents") {
    return { prefix: "agent-aggregator", singular: "Agent", plural: "agent" }
  }

  if (key === "tools") {
    return { prefix: "tool-aggregator", singular: "Tool", plural: "tool" }
  }

  return { prefix: "hook-aggregator", singular: "Hook", plural: "hook" }
}

export function aggregateContributions<K extends ContributionKey, T>(
  plugins: PluginDefinition[],
  key: K,
  options: AggregateOptions,
): AggregateResult<K, T> {
  const disabled = new Set(options.disabled ?? [])
  const skipped: string[] = []
  const descriptor = describeContribution(key)

  if (options.onConflict === "append") {
    const map = new Map<string, T[]>()

    for (const plugin of plugins) {
      const contributions = plugin[key]
      if (!contributions) {
        continue
      }

      for (const [name, contribution] of Object.entries(contributions)) {
        if (contribution === undefined) {
          continue
        }

        if (disabled.has(name)) {
          skipped.push(name)
          continue
        }

        const entries = map.get(name) ?? []
        entries.push(contribution as T)
        map.set(name, entries)
      }
    }

    if (skipped.length > 0) {
      log(`[${descriptor.prefix}] Skipped ${skipped.length} disabled ${descriptor.plural}(s): ${skipped.join(", ")}`)
    }

    return map as AggregateResult<K, T>
  }

  const record: Record<string, T> = {}

  for (const plugin of plugins) {
    const contributions = plugin[key]
    if (!contributions) {
      continue
    }

    for (const [name, contribution] of Object.entries(contributions)) {
      if (contribution === undefined) {
        continue
      }

      if (disabled.has(name)) {
        skipped.push(name)
        continue
      }

      if (record[name]) {
        log(
          `[${descriptor.prefix}] CONFLICT: ${descriptor.singular} "${name}" from plugin "${plugin.name}" overwrites existing registration. To avoid this, ensure ${descriptor.plural} names are unique across plugins.`,
          {
            plugin: plugin.name,
            [descriptor.plural]: name,
          },
        )
      }

      record[name] = contribution as T
    }
  }

  if (skipped.length > 0) {
    log(`[${descriptor.prefix}] Skipped ${skipped.length} disabled ${descriptor.plural}(s): ${skipped.join(", ")}`)
  }

  return record as AggregateResult<K, T>
}
