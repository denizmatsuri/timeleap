---
name: nextjs-app-router
description: Next.js 16 App Router 규칙. Server/Client Component 경계, Server Action 템플릿, middleware(auth + rate limit), loading/error/not-found 상태 페이지를 다룰 때 자동 로드. src/app/** 과 src/middleware.ts 에서 활성화.
paths:
  - src/app/**
  - src/middleware.ts
---

# Next.js 16 App Router

**언제 쓰나:** `src/app/**` 라우트, `actions.ts`, `middleware.ts`를 수정할 때.

**참고:** Next.js 16은 훈련 데이터와 다름. 의심 가면 `node_modules/next/dist/docs/`부터 확인.
**Cross-ref:** 캐싱/스트리밍 상세는 [nextjs-caching-streaming](../nextjs-caching-streaming/SKILL.md), DB 접근은 [supabase](../supabase/SKILL.md), AI 호출은 [ai-pipeline](../ai-pipeline/SKILL.md).

---

## 1. Server vs Client 경계

**기본은 Server Component.** `"use client"`는 다음 경우에만:

- 상호작용 상태(`useState`, `useReducer`, `useOptimistic`)
- 브라우저 API(`localStorage`, `window`, `navigator`, `IntersectionObserver`)
- 이벤트 핸들러 (`onClick`, `onChange` 등)
- 서드파티 클라이언트 라이브러리(Framer Motion의 `motion.*`, Zustand 훅 등)

### 경계 밀어올리기

Server Component 안에 Client Component를 **props로 children 주입**하면 서버 데이터 노출 없이 상호작용 섬을 만든다.

```tsx
// src/app/feed/[id]/page.tsx  (Server Component)
import { LikeButton } from "@/components/feed/like-button"; // Client

export default async function FeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next.js 16: params는 Promise
  const diary = await getDiary(id); // 서버에서 fetch

  return (
    <article>
      <h1>{diary.title}</h1>
      <p>{diary.body}</p>
      <LikeButton diaryId={diary.id} initialCount={diary.likes_count} />
    </article>
  );
}
```

### DO / DON'T

- DO: Server Component에서 DB/AI 직접 호출.
- DO: 클라이언트 경계 최소화, leaf에만 `"use client"`.
- DON'T: 시크릿이나 전체 row를 Client Component props로 내려보내기. 필요한 필드만.
- DON'T: Server Component에서 `useState`/브라우저 API.

---

## 2. Server Action 템플릿 (6단계)

Mutation은 **Server Action 우선**. API Route는 webhook/OG/외부 콜백에만.

```ts
// src/app/time-machine/actions.ts
"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const CreateDiaryInput = z.object({
  era: z.string().min(1),
  countryCode: z.string().length(2),
});

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createDiary(
  input: z.infer<typeof CreateDiaryInput>,
): Promise<ActionResult<{ diaryId: string }>> {
  // 1. Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHORIZED" };

  // 2. Input 검증 (Zod)
  const parsed = CreateDiaryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  // 3. Rate limit (user 단위)
  const rl = await checkRateLimit({ userId: user.id, key: "createDiary" });
  if (!rl.ok) return { ok: false, error: "RATE_LIMITED" };

  // 4. 비즈니스 로직 (DB/AI 호출은 각 skill 참조)
  const { data, error } = await supabase
    .from("diaries")
    .insert({ user_id: user.id, era: parsed.data.era, country_code: parsed.data.countryCode })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // 5. 캐시 무효화
  revalidateTag("feed-list");
  revalidateTag(`user:${user.id}`);

  // 6. 반환
  return { ok: true, data: { diaryId: data.id } };
}
```

### 규칙

- 파일명: `actions.ts` (라우트별 co-locate) 또는 `src/lib/actions/<domain>.ts`
- 함수명: 동사 시작 (`createDiary`, `toggleLike`, `deleteDiary`)
- 반환 타입: `ActionResult<T>` 통일 (throw 대신 `{ ok, error }`)
- 시작에 `"use server"` 선언
- auth / zod / rate-limit 순서 고정

### DO / DON'T

- DO: form action으로 직접 바인딩하거나 `useTransition` + 클라이언트 핸들러에서 호출.
- DON'T: Server Action에서 예외를 날것으로 throw (UX 나쁨). `ActionResult`로 감싸기.
- DON'T: Rate limit 없이 AI 비용 발생 경로 호출.

---

## 3. Middleware

`src/middleware.ts` 하나에 **Supabase auth 세션 갱신 + IP 기반 rate limit**을 얹는다.

```ts
// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { edgeRateLimit } from "@/lib/rate-limit/edge";

export async function middleware(request: NextRequest) {
  // 1. Edge rate limit (IP 기반, AI 호출 경로 방어)
  if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname.startsWith("/time-machine/result")) {
    const limited = await edgeRateLimit(request);
    if (limited) return new NextResponse("Rate limited", { status: 429 });
  }

  // 2. Supabase 세션 갱신 (cookie 동기화)
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Rate limit은 2계층:** edge(IP) + action(user). 자세한 건 [ai-pipeline](../ai-pipeline/SKILL.md).
**Supabase client 생성은** [supabase](../supabase/SKILL.md).

---

## 4. 상태 페이지 (세계관 톤)

`loading.tsx` / `error.tsx` / `not-found.tsx`는 타임머신 세계관에 맞게. 무미건조한 스피너 금지.

```tsx
// src/app/time-machine/result/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-lg text-muted-foreground">시간의 틈을 건너는 중…</p>
      {/* Framer Motion은 ui-components skill 참조 */}
    </div>
  );
}
```

```tsx
// src/app/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h2 className="text-xl">타임머신이 길을 잃었어요.</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">다시 시도</button>
    </div>
  );
}
```

### 규칙

- `loading.tsx`는 기본 Server Component.
- `error.tsx`는 **반드시** `"use client"` + `error`/`reset` props.
- 공통 레이아웃은 `layout.tsx`, 데이터 의존 상태는 Suspense boundary (→ caching-streaming skill).

---

## 5. Route Handler는 이럴 때만

`app/api/**/route.ts`는 다음에만:

- **Dynamic OG** — `/api/og/[feedId]` (→ ai-pipeline skill)
- **Webhook** — Supabase/Stripe 등 외부 서비스가 POST 치는 엔드포인트
- **외부 콜백** — OAuth 리다이렉트가 필요할 때

그 외 모든 mutation은 Server Action.

---

## 6. `params` / `searchParams`는 Promise

Next.js 16에서 동적 라우트의 `params`, `searchParams`는 **Promise**. 반드시 `await`.

```tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const { sort } = await searchParams;
  // ...
}
```

---

## 체크리스트 (PR 전)

- [ ] Server Action에 auth / zod / rate-limit 3단 가드 있는가
- [ ] `revalidateTag` / `revalidatePath` 적절한가 (→ caching-streaming skill)
- [ ] `"use client"`가 leaf에만 있는가
- [ ] `params`/`searchParams`를 `await`했는가
- [ ] `loading.tsx` / `error.tsx`가 세계관 톤인가
