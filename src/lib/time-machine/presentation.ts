export const DEFAULT_ERA_EMOJI = "✦";

const ERA_EMOJI_BY_ID: Record<string, string> = {
  "eg-cairo-deco": "🏨",
  "eg-thebes": "𓂀",
  "fr-belle-epoque": "🥂",
  "fr-riviera": "☀️",
  "gb-punk": "⚡",
  "gb-victorian": "🕯️",
  "in-ajanta": "🪔",
  "in-mughal": "🕌",
  "jp-bubble": "🥃",
  "jp-taisho": "🎐",
  "jp-tokyo64": "🚄",
  "kr-gyeongseong": "🎩",
  "kr-myeongdong": "📷",
  "kr-olympic": "🏟️",
  "kr-sewoon": "📻",
  "kr-silla": "👑",
  "mx-acapulco": "🌴",
  "mx-coyoacan": "🌵",
  "mx-fiesta": "🎉",
  "mx-golden-age": "🎭",
  "tr-byzantine": "⛪",
  "tr-ottoman": "🧿",
  "us-disco": "🪩",
  "us-drive-in": "🚗",
  "us-harlem": "🎷",
};

export function getEraEmoji(eraId: string) {
  return ERA_EMOJI_BY_ID[eraId] ?? DEFAULT_ERA_EMOJI;
}
