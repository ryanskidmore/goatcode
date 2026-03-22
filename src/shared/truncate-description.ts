const DEFAULT_MAX_LENGTH = 100

export function truncateDescription(text: string, maxLength = DEFAULT_MAX_LENGTH): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + "..."
}
