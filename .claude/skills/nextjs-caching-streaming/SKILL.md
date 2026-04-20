---
name: nextjs-caching-streaming
description: Next.js 16 ISR + revalidateTag + unstable_cache + Streaming SSR + useOptimistic 전략. 공개 갤러리 캐싱, 타임머신 결과 스트리밍, 좋아요/삭제 낙관적 업데이트를 다룰 때 자동 로드. src/app/** 과 src/lib/cache/** 에서 활성화.
paths:
  - src/app/**
  - src/lib/cache/**
---

# 캐싱 & 스트리밍 전략

**언제 쓰나:** 공개 페이지 ISR 설정, AI 결과 스트리밍 출력, 캐시 태그/무효화, useOptimistic을 작성할 때.

**Cross-ref:** Server Action 구조는 [nextjs-app-router](../nextjs-app-router/SKILL.md), DB 접근은 [supabase](../supabase/SKILL.md).

---

## 1. 3계층 캐싱 전략

```
┌─ 정적 캐싱 (ISR)
│   일기 본문, 이미지, 메타데이터 — 거의 안 바뀜
│   revalidate + 태그로 신선도 유지
│
├─ 요청 캐싱 (unstable_cache / fetch cache)
│   시대 배경, Wikipedia 조회 — 서비스 전체에서 공유
│
└─ 동적 (Client Fetch / TanStack Query)
    좋아요 수, 내 좋아요 여부 — ISR 캐시에 포함하지 않음
```

**ISR과 동적 데이터를 섞지 않는다.** 좋아요 카운트를 ISR 본문에 넣으면 1분마다 페이지 전체 재생성. 좋아요는 클라이언트 쿼리로 분리. ([client-state](../client-state/SKILL.md) 참조)

---

## 2. 태그 taxonomy (고정)

모든 `revalidateTag` 호출은 이 표에서만 선택:

| 태그 | 의미 | 무효화 시점 |
| --- | --- | --- |
| `feed-list` | `/explore` 공개 피드 목록 | 일기 공개 전환, 신규 공개 일기 생성 |
| `feed:${id}` | 개별 공개 일기 상세 | 해당 일기 수정/삭제/공개 토글 |
| `user:${id}` | 특정 유저 공개 프로필 | 유저 본인 일기 생성/수정/공개 토글 |
| `era:${era}` | 시대별 필터 페이지 | 해당 시대 공개 일기 생성/삭제 |
| `country:${code}` | 국가별 필터 페이지 | 해당 국가 공개 일기 생성/삭제 |

**새 태그를 임의로 만들지 마라.** 먼저 이 표에 추가한 뒤 사용.

---

## 3. ISR 페이지 세팅

```tsx
// src/app/explore/page.tsx  (Server Component)
export const revalidate = 60; // 60초마다 재생성
export const dynamic = "force-static"; // 기본은 정적
// 동적 매개변수 사용 시: dynamicParams = true

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const getPublicFeed = unstable_cache(
  async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("diaries")
      .select("id, title, era, country_code, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  },
  ["public-feed"],
  { tags: ["feed-list"], revalidate: 60 },
);

export default async function ExplorePage() {
  const feed = await getPublicFeed();
  return <FeedGrid items={feed} />;
}
```

### `revalidateTag` vs `revalidatePath`

- **`revalidateTag(tag)`** — 여러 페이지가 같은 태그를 쓰는 경우(공개 피드 + 프로필 + 시대 필터가 동시에 무효화돼야 할 때). **기본 선택.**
- **`revalidatePath(path)`** — 특정 URL 한 개만 무효화. 태그 매핑이 과한 1회성 상황에만.

```ts
// Server Action 끝부분
revalidateTag("feed-list");
revalidateTag(`user:${user.id}`);
revalidateTag(`era:${diary.era}`);
revalidateTag(`country:${diary.country_code}`);
```

---

## 4. `unstable_cache` 래퍼 (외부 조회)

Wikipedia · 시대 메타데이터 등 **서비스 전체에서 공유**되는 데이터는 `unstable_cache`.

```ts
// src/lib/cache/era-metadata.ts
import { unstable_cache } from "next/cache";

export const getEraMetadata = unstable_cache(
  async (era: string) => {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${era}`);
    if (!res.ok) throw new Error("WIKI_FETCH_FAILED");
    return res.json();
  },
  ["era-metadata"],
  { revalidate: 60 * 60 * 24 * 7, tags: ["era-metadata"] }, // 일주일
);
```

**AI 생성 결과는 `unstable_cache`가 아니라 DB 영구 캐싱** (→ [ai-pipeline](../ai-pipeline/SKILL.md)).

---

## 5. Streaming SSR — 타임머신 결과 페이지 (핵심 연출)

AI 이미지 → 일기 본문 **순차** 출력. 사용자 체감 속도 + "과거에서 전송되는" 세계관 연출.

```tsx
// src/app/time-machine/result/[id]/page.tsx
import { Suspense } from "react";
import { DiaryImages } from "@/components/time-machine/diary-images";
import { DiaryBody } from "@/components/time-machine/diary-body";
import { ImagesSkeleton, BodySkeleton } from "@/components/time-machine/skeletons";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-10">
      <p className="text-sm text-muted-foreground">과거로부터 도착 중…</p>

      {/* 먼저 도착: 사진 */}
      <Suspense fallback={<ImagesSkeleton />}>
        <DiaryImages diaryId={id} />
      </Suspense>

      {/* 이어서 도착: 일기 본문 */}
      <Suspense fallback={<BodySkeleton />}>
        <DiaryBody diaryId={id} />
      </Suspense>
    </div>
  );
}
```

```tsx
// src/components/time-machine/diary-images.tsx  (Server Component, async)
export async function DiaryImages({ diaryId }: { diaryId: string }) {
  const images = await generateOrFetchImages(diaryId); // AI 호출 (ai-pipeline)
  return <Gallery images={images} />;
}
```

### 규칙

- 각 Suspense boundary는 **독립된 async Server Component**를 감싼다.
- 이미지 먼저, 본문 나중 순서 유지 (세계관 일관성).
- Skeleton은 톤 맞춰 (→ [ui-components](../ui-components/SKILL.md)).
- 텍스트를 타이핑하듯 출력하고 싶으면 별도의 streaming text component를 Client로 두고 ReadableStream을 받는다.

---

## 6. `useOptimistic` 레시피

좋아요 토글, 삭제, 공개 토글 같은 **짧은 mutation**은 낙관적 업데이트로 즉각 피드백.

```tsx
// src/components/feed/like-button.tsx
"use client";
import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/feed/actions";

export function LikeButton({
  diaryId,
  initialCount,
  initiallyLiked,
}: {
  diaryId: string;
  initialCount: number;
  initiallyLiked: boolean;
}) {
  const [state, setOptimistic] = useOptimistic(
    { count: initialCount, liked: initiallyLiked },
    (prev, next: boolean) => ({
      count: prev.count + (next ? 1 : -1),
      liked: next,
    }),
  );
  const [, startTransition] = useTransition();

  const handleToggleLike = () => {
    startTransition(async () => {
      setOptimistic(!state.liked);
      await toggleLike({ diaryId }); // 실패 시 자동 롤백
    });
  };

  return (
    <button onClick={handleToggleLike} aria-pressed={state.liked}>
      ♥ {state.count}
    </button>
  );
}
```

### DO / DON'T

- DO: Server Action은 성공/실패를 ActionResult로 반환 → transition이 알아서 롤백.
- DON'T: `useOptimistic`으로 **생성(create)** 다루지 마라. 새 diary 생성 같은 무거운 작업은 진짜 loading + streaming.
- DON'T: 낙관적 상태를 다른 쿼리의 source of truth로 쓰기.

---

## 7. 경로 설계 (feature-guide 정합)

| 경로 | 캐싱 | 비고 |
| --- | --- | --- |
| `/` (랜딩) | ISR, `revalidate: 3600` | 공개 샘플만 |
| `/explore` | ISR, `feed-list` 태그 | 최신순/인기순 |
| `/explore/country/[code]` | ISR, `country:${code}` 태그 | `generateStaticParams` 선택적 |
| `/explore/era/[era]` | ISR, `era:${era}` 태그 | 동일 |
| `/feed/[id]` | ISR, `feed:${id}` 태그 | SEO + OG |
| `/u/[username]` | ISR, `user:${id}` 태그 | |
| `/me`, `/me/**` | 동적 (`dynamic = "force-dynamic"`) | 본인 전용 |
| `/time-machine/result/[id]` | 동적 + Streaming | 캐싱 X |

---

## 체크리스트

- [ ] 공개 페이지에 `revalidate` + 태그 설정했는가
- [ ] Server Action이 관련 태그 모두 무효화하는가 (feed-list + user + era + country)
- [ ] 태그 이름이 표에 있는가 (임의 네이밍 금지)
- [ ] 스트리밍 경계가 독립 async Server Component인가
- [ ] `useOptimistic`이 생성이 아닌 토글류에만 쓰였는가
