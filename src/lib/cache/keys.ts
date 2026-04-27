export const PUBLIC_FEED_CACHE_TAG = "feed-list";

export function createPublicDiaryCacheTag(diaryId: string) {
  return `feed-diary:${diaryId}`;
}
