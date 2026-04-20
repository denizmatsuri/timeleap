---
name: client-state
description: 클라이언트 상태 관리 — Zustand 스토어 템플릿, TanStack Query 키 팩토리와 쿼리/뮤테이션 훅, 5단계 optimistic update. Server Component/Query/Zustand 선택 기준을 정할 때 자동 로드. src/stores/** 와 src/hooks/** 에서 활성화.
paths:
  - src/stores/**
  - src/hooks/**
---

# 클라이언트 상태

**언제 쓰나:** Zustand 스토어, TanStack Query 훅, 뮤테이션, 낙관적 업데이트를 만들 때.

**Cross-ref:** Server Action은 [nextjs-app-router](../nextjs-app-router/SKILL.md), 서버 측 `useOptimistic` 패턴은 [nextjs-caching-streaming](../nextjs-caching-streaming/SKILL.md).

---

## 1. 상태 결정 매트릭스

**순서대로 내려가면서 먼저 맞는 곳에서 멈춘다.** 불필요하게 클라이언트 상태로 끌어올리지 않기.

| 상황 | 도구 |
| --- | --- |
| 페이지 로드시 1회 fetch, 거의 정적 | Server Component + `await` |
| 서버 데이터 + 캐시/재시도/background refetch 필요 | **TanStack Query** |
| 폼 1회성 입력 | React state (`useState`) |
| **여러 컴포넌트가 공유하는 UI 전용 상태** (모달 열림/닫힘, 테마 토글) | **Zustand** |
| 좋아요/삭제같이 즉각 UI 반영 | `useOptimistic` (서버) 또는 Query mutation + optimistic |

**Zustand는 서버 데이터 저장 금지.** 서버 데이터는 TanStack Query로만. 겹치면 두 source of truth가 생긴다.

---

## 2. Zustand 스토어 템플릿

### 기본 패턴

```ts
// src/stores/use-modal-store.ts
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { devtools } from "zustand/middleware";

type ModalState =
  | { type: "closed" }
  | { type: "delete-diary"; diaryId: string }
  | { type: "share-diary"; diaryId: string };

export const useModalStore = create(
  devtools(
    combine(
      { modal: { type: "closed" } as ModalState },
      (set) => ({
        openDeleteDiary: (diaryId: string) =>
          set({ modal: { type: "delete-diary", diaryId } }),
        openShareDiary: (diaryId: string) =>
          set({ modal: { type: "share-diary", diaryId } }),
        closeModal: () => set({ modal: { type: "closed" } }),
      }),
    ),
    { name: "modal" },
  ),
);
```

### 규칙

- 항상 `create + combine + devtools` 3종 세트.
- `devtools`는 `{ name }`으로 식별 — Redux DevTools에서 구분 가능.
- **State 타입은 discriminated union** — modal 같은 "열림/닫힘" 상태에 특히.
- 액션은 `set`을 클로저로 받는 함수로. 바깥에서 setter export 금지.
- **persist는 필요할 때만.** 인증 상태는 Supabase가 관리 (Zustand에 복제 X).

### 파생 셀렉터

컴포넌트가 불필요하게 리렌더되지 않도록:

```ts
// 사용처
const modal = useModalStore((s) => s.modal);
const closeModal = useModalStore((s) => s.closeModal);
```

`useModalStore()`로 전체 구독 금지.

---

## 3. TanStack Query — 키 팩토리

쿼리 키는 **반드시 팩토리 객체**로만 생성. 문자열 리터럴 직접 쓰지 말 것.

```ts
// src/hooks/diaries/query-keys.ts
export const diaryKeys = {
  all: ["diaries"] as const,
  lists: () => [...diaryKeys.all, "list"] as const,
  list: (filters: { era?: string; country?: string }) =>
    [...diaryKeys.lists(), filters] as const,
  details: () => [...diaryKeys.all, "detail"] as const,
  detail: (id: string) => [...diaryKeys.details(), id] as const,
  myFeed: () => [...diaryKeys.all, "mine"] as const,
};
```

이유: `invalidateQueries({ queryKey: diaryKeys.lists() })` 한 줄로 모든 list 변형을 무효화.

---

## 4. Query 훅 템플릿

```ts
// src/hooks/diaries/use-diary-detail.ts
import { useQuery } from "@tanstack/react-query";
import { diaryKeys } from "./query-keys";
import { createClient } from "@/lib/supabase/browser";
import type { Diary } from "@/types/domain";

async function fetchDiary(id: string): Promise<Diary> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("diaries")
    .select("id, title, body, era, country_code, is_public, created_at")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export function useDiaryDetail(id: string) {
  return useQuery({
    queryKey: diaryKeys.detail(id),
    queryFn: () => fetchDiary(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
```

### 규칙

- 파일 1개당 훅 1개.
- `queryFn`은 같은 파일에 co-locate (단순할 때) 또는 `src/lib/api/` 로 분리 (복잡할 때).
- `staleTime` 항상 명시 (기본 0은 과도한 refetch 유발).
- Supabase 쿼리는 **브라우저 클라이언트** 사용 (RLS로 보호).

---

## 5. Mutation + 5단계 Optimistic Update

```ts
// src/hooks/likes/use-toggle-like.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { diaryKeys } from "@/hooks/diaries/query-keys";
import { toggleLike } from "@/app/feed/actions";
import type { Diary } from "@/types/domain";

export function useToggleLike(diaryId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (nextLiked: boolean) => toggleLike({ diaryId, liked: nextLiked }),

    // 1. 진행 중인 리페치 취소 — 우리가 set한 값이 덮어쓰지 않도록
    onMutate: async (nextLiked) => {
      await qc.cancelQueries({ queryKey: diaryKeys.detail(diaryId) });

      // 2. 이전 스냅샷 저장
      const previous = qc.getQueryData<Diary>(diaryKeys.detail(diaryId));

      // 3. 낙관적 업데이트
      type DiaryWithLikes = Diary & { likes_count: number; liked_by_me: boolean };
      if (previous) {
        const prev = previous as DiaryWithLikes;
        qc.setQueryData<DiaryWithLikes>(
          diaryKeys.detail(diaryId),
          {
            ...prev,
            liked_by_me: nextLiked,
            likes_count: prev.likes_count + (nextLiked ? 1 : -1),
          },
        );
      }

      return { previous };
    },

    // 4. 실패 시 롤백
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(diaryKeys.detail(diaryId), ctx.previous);
      }
    },

    // 5. 최종 서버 상태와 동기화
    onSettled: () => {
      qc.invalidateQueries({ queryKey: diaryKeys.detail(diaryId) });
    },
  });
}
```

### 5단계 (외우기)

1. **cancel** — `cancelQueries`로 경쟁 상태 제거
2. **snapshot** — `getQueryData`로 이전 값 백업
3. **optimistic** — `setQueryData`로 선반영
4. **rollback** — `onError`에서 백업값 복구
5. **settle** — `onSettled`에서 `invalidateQueries`

모든 optimistic mutation은 이 순서 고정. 누락 금지.

---

## 6. SSR Hydration

Server Component에서 prefetch 하고 Client에서 이어받기:

```tsx
// src/app/feed/[id]/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { DiaryDetailClient } from "@/components/feed/diary-detail-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: ["diaries", "detail", id],
    queryFn: () => fetchDiaryOnServer(id),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DiaryDetailClient id={id} />
    </HydrationBoundary>
  );
}
```

- 각 요청마다 **새 QueryClient** 인스턴스 (싱글톤 금지).
- 서버용 query fn과 브라우저용 query fn 시그니처를 맞춰두기.

---

## 7. Provider 설정

```tsx
// src/components/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
```

- `useState(() => new QueryClient())` — Re-render에 유지.
- devtools 필요하면 `<ReactQueryDevtools />` dev-only.

---

## 8. 폴더 구조

```
src/
├── stores/
│   ├── use-modal-store.ts
│   └── use-theme-store.ts
└── hooks/
    ├── diaries/
    │   ├── query-keys.ts
    │   ├── use-diary-detail.ts
    │   ├── use-diary-list.ts
    │   └── use-create-diary.ts
    └── likes/
        └── use-toggle-like.ts
```

도메인별 서브폴더 + `query-keys.ts`를 도메인 루트에.

---

## DO / DON'T

- DO: 서버 데이터는 TanStack Query, UI 전용은 Zustand.
- DO: 쿼리 키는 팩토리로만.
- DO: optimistic mutation은 5단계 모두.
- DON'T: Zustand에 서버 응답 저장.
- DON'T: `useQuery`의 `queryKey`에 리터럴 직접 쓰기.
- DON'T: 전역 Zustand 싱글 store에 도메인 섞어넣기 — 관심사별로 분리.
