---
name: ui-components
description: shadcn/ui 기반 컴포넌트 + Tailwind + Framer Motion + next/image 패턴. 6단계 컴포넌트 스켈레톤, handle[Verb][Target] 핸들러, early-return 상태 처리, 다크모드/모바일 우선 UI를 다룰 때 자동 로드. src/components/**, src/app/**/page.tsx, src/app/**/layout.tsx 에서 활성화.
paths:
  - src/components/**
  - src/app/**/page.tsx
  - src/app/**/layout.tsx
---

# UI 컴포넌트

**언제 쓰나:** 컴포넌트 파일, 페이지, 레이아웃을 만들거나 수정할 때.

**Cross-ref:** 상태(훅/스토어)는 [client-state](../client-state/SKILL.md), Server Component 경계는 [nextjs-app-router](../nextjs-app-router/SKILL.md).

---

## 1. 컴포넌트 스켈레톤 (6단계)

```tsx
// src/components/feed/feed-item.tsx
"use client"; // ← 상호작용이 있을 때만. 없으면 이 줄 생략.

// 1. Imports (외부 → 내부 → 타입)
import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Diary } from "@/types/domain";

// 2. Props 타입 (컴포넌트 옆에 co-locate)
interface FeedItemProps {
  diary: Diary;
  onLike?: (id: string) => void;
}

// 3. 컴포넌트
export function FeedItem({ diary, onLike }: FeedItemProps) {
  // 4. 훅 / 파생 상태
  const [expanded, setExpanded] = useState(false);

  // 5. 핸들러 (handle[Verb][Target])
  const handleToggleExpand = () => setExpanded((v) => !v);
  const handleClickLike = () => onLike?.(diary.id);

  // 6. Early return (로딩/에러/빈 상태) — 있으면 먼저
  if (!diary.title) return null;

  // 7. JSX
  return (
    <article className={cn("rounded-lg border p-4", expanded && "bg-muted")}>
      <h3 className="text-base font-semibold">{diary.title}</h3>
      <Button variant="ghost" size="icon" onClick={handleClickLike} aria-label="좋아요">
        <Heart className="size-4" />
      </Button>
    </article>
  );
}
```

### 네이밍

| 요소 | 규칙 | 예 |
| --- | --- | --- |
| 파일 | kebab-case | `feed-item.tsx`, `time-machine-button.tsx` |
| 컴포넌트 | PascalCase | `FeedItem`, `TimeMachineButton` |
| Props 타입 | `<Name>Props` | `FeedItemProps` |
| 이벤트 핸들러 | `handle[Verb][Target]` | `handleSubmitDiary`, `handleToggleLike`, `handleChangeEra` |
| Prop 콜백 | `on[Event]` | `onLike`, `onSubmit`, `onSelectEra` |

---

## 2. shadcn/ui 규칙

- **설치는 CLI로**: `pnpm dlx shadcn@latest add button dialog form`
- `components/ui/*` **원본 파일 직접 수정 금지**. 필요하면 wrapper 만들기:

```tsx
// src/components/common/primary-button.tsx
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrimaryButton({ className, ...rest }: ButtonProps) {
  return <Button className={cn("font-semibold", className)} {...rest} />;
}
```

- 아이콘은 **Lucide React만**. 다른 아이콘 라이브러리 섞지 않기.
- `cn()` 유틸(`src/lib/utils.ts`)로 `className` 병합.

---

## 3. 상태 UI (early return 패턴)

로딩 / 에러 / 빈 상태는 **JSX 본문 전에** 빠져나온다.

```tsx
export function DiaryList({ diaries, isLoading, error }: DiaryListProps) {
  if (isLoading) return <DiaryListSkeleton />;
  if (error) return <EmptyState tone="error">일기를 불러오지 못했어요.</EmptyState>;
  if (diaries.length === 0) return <EmptyState>아직 다녀온 시대가 없어요.</EmptyState>;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {diaries.map((d) => <FeedItem key={d.id} diary={d} />)}
    </ul>
  );
}
```

- Skeleton은 shadcn `Skeleton` + Tailwind.
- Empty state는 세계관 톤 ("아직 다녀온 시대가 없어요").
- Error copy는 기술 용어 피하기.

---

## 4. Framer Motion

```tsx
// src/components/common/fade-in.tsx
"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

### 규칙

- `motion.*`는 **반드시 `"use client"`** 모듈에서.
- **`useReducedMotion` 가드 필수** — 접근성.
- 페이지 전체를 motion으로 감싸지 말고, 전환이 의미 있는 지점만 감싼다.
- 복잡한 시퀀스는 `AnimatePresence` + custom variants 사용, 인라인 prop 지옥 피하기.

---

## 5. `next/image` + Supabase Storage

`next.config.ts`에 Supabase Storage 도메인을 등록:

```ts
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "<PROJECT_REF>.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
export default config;
```

```tsx
import Image from "next/image";

<Image
  src={publicUrl}
  alt={diary.title}
  width={800}
  height={800}
  sizes="(min-width: 768px) 50vw, 100vw"
  className="rounded-lg object-cover"
  priority={isAboveFold}
/>
```

### 규칙

- 외부 이미지는 **무조건 `next/image`**. `<img>` 금지.
- `alt`는 의미 있는 문구 (빈 문자열은 장식용일 때만).
- `sizes`를 설정해 적절한 srcset 뽑기.
- 서명된 private URL(faces)은 Server에서만 다룸 — 클라이언트로 내려보내지 않음.

---

## 6. Tailwind 규칙

- **인라인 `style` 금지.** 모든 스타일은 Tailwind 클래스.
- 동적 값은 `className` 안에서 조건부 병합 (`cn()`), 절대 `style={{...}}` 쓰지 않기.
- 색상은 shadcn 토큰 (`text-foreground`, `bg-muted`, `border-border`) — 생 hex 쓰지 않기.
- 다크모드: shadcn 기본 `dark:` 접두사 그대로. 토큰이 자동 전환됨.
- **모바일 우선**: 기본은 모바일, `md:`, `lg:`로 확장.

```tsx
<div className="flex flex-col gap-3 p-4 md:flex-row md:gap-6 md:p-8">
```

---

## 7. 레이아웃 / 페이지

```tsx
// src/app/layout.tsx
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geist.variable} min-h-dvh bg-background font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- `<html lang="ko">` — 한국어 컨텐츠 기본.
- `min-h-dvh` (dynamic viewport) — 모바일 safe.
- 전역 Provider는 Client Component로 모아서 (`Providers`) 감싸기.

---

## 8. 접근성 체크리스트

- [ ] 상호작용 요소에 `aria-label` 또는 텍스트
- [ ] 이미지에 `alt`
- [ ] 폼 `<label htmlFor>` 연결
- [ ] Motion에 `useReducedMotion` 가드
- [ ] 다크모드에서 대비 확인

---

## DO / DON'T 요약

- DO: shadcn wrapper 컴포넌트로 확장.
- DO: handle[Verb][Target] 핸들러 네이밍.
- DO: early return으로 로딩/에러/빈 상태 먼저 처리.
- DON'T: 인라인 `style`, `<img>`, `components/ui/*` 직접 수정, 여러 아이콘 라이브러리 병용.
- DON'T: Server Component에 `"use client"` 모듈 import한 뒤 motion/useState 사용 시도 (에러).
