const NIBBLE_STR = "ZPMQVRWSNKTXJBYH"
const HASHLINE_DICT = Array.from({ length: 256 }, (_, i) => {
  const high = i >>> 4
  const low = i & 0x0f
  return `${NIBBLE_STR[high]}${NIBBLE_STR[low]}`
})

const RE_SIGNIFICANT = /[\p{L}\p{N}]/u

function computeNormalizedLineHash(lineNumber: number, normalizedContent: string): string {
  const stripped = normalizedContent
  const seed = RE_SIGNIFICANT.test(stripped) ? 0 : lineNumber
  const hash = Bun.hash.xxHash32(stripped, seed)
  const index = hash % 256
  return HASHLINE_DICT[index]
}

export function computeLineHash(lineNumber: number, content: string): string {
  return computeNormalizedLineHash(lineNumber, content.replace(/\r/g, "").trimEnd())
}

export function formatHashLine(lineNumber: number, content: string): string {
  const hash = computeLineHash(lineNumber, content)
  return `${lineNumber}#${hash}|${content}`
}
