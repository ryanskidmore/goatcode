export interface PromptMetaChangelogEntry {
  version: string
  date: string
  description: string
}

export interface PromptMeta {
  version: string
  date: string
  summary: string
  changelog: PromptMetaChangelogEntry[]
}
