export type BuiltinPlatformId = "direct" | "zen";
export type PlatformId = BuiltinPlatformId | (string & {});

type PrefixMapping = {
  canonical: string;
  platform: string;
};

const ZEN_PREFIX_MAPPINGS: PrefixMapping[] = [
  { canonical: "anthropic/", platform: "zen-anthropic/" },
  { canonical: "openai/", platform: "zen-openai/" },
  { canonical: "google/", platform: "zen-google/" },
];

const PLATFORM_MAPPINGS: Record<string, PrefixMapping[]> = {
  direct: [],
  zen: ZEN_PREFIX_MAPPINGS,
};

// "anthropic/claude-opus-4-6" + "zen" -> "zen-anthropic/claude-opus-4-6"
export function toPlatformModel(canonicalModel: string, platform: PlatformId): string {
  if (platform === "direct") return canonicalModel;

  const mappings = PLATFORM_MAPPINGS[platform];
  if (!mappings) return canonicalModel;

  for (const { canonical, platform: platformPrefix } of mappings) {
    if (canonicalModel.startsWith(canonical)) {
      return platformPrefix + canonicalModel.slice(canonical.length);
    }
  }

  return canonicalModel;
}

// "zen-anthropic/claude-opus-4-6" + "zen" -> "anthropic/claude-opus-4-6"
export function toCanonicalModel(platformModel: string, platform: PlatformId): string {
  if (platform === "direct") return platformModel;

  const mappings = PLATFORM_MAPPINGS[platform];
  if (!mappings) return platformModel;

  for (const { canonical, platform: platformPrefix } of mappings) {
    if (platformModel.startsWith(platformPrefix)) {
      return canonical + platformModel.slice(platformPrefix.length);
    }
  }

  return platformModel;
}

export function registerPlatformMappings(platform: string, mappings: PrefixMapping[]): void {
  PLATFORM_MAPPINGS[platform] = mappings;
}

export function getKnownPlatforms(): string[] {
  return Object.keys(PLATFORM_MAPPINGS);
}
