export const DEFAULT_ERA_EMOJI = "✦";

const ERA_EMOJI_BY_ID: Record<string, string> = {
  "fr-belle-epoque": "🥂",
  "fr-riviera": "☀️",
  "gb-punk": "⚡",
  "gb-victorian": "🕯️",
  "jp-bubble": "🥃",
  "jp-taisho": "🎐",
  "jp-tokyo64": "🚄",
  "kr-gyeongseong": "🎩",
  "kr-sewoon": "📻",
  "kr-myeongdong": "📷",
  "kr-olympic": "🏟️",
  "mx-acapulco": "🌴",
  "mx-coyoacan": "🌵",
  "mx-fiesta": "🎉",
  "mx-golden-age": "🎭",
  "us-disco": "🪩",
  "us-drive-in": "🚗",
  "us-harlem": "🎷",
};

export function getEraEmoji(eraId: string) {
  return ERA_EMOJI_BY_ID[eraId] ?? DEFAULT_ERA_EMOJI;
}
