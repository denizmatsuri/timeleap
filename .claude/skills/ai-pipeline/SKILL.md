---
name: ai-pipeline
description: AI 생성 파이프라인 — Anthropic Claude(텍스트), Google Gemini Nano Banana 2(이미지), 프롬프트 파일 레이아웃, 입력 해시 영구 캐싱, 2계층 rate limit, moderation gate, Dynamic OG. 얼굴 합성·일기 생성·프롬프트 작성 시 자동 로드. src/lib/ai/**, src/lib/prompts/**, src/app/api/og/** 에서 활성화.
paths:
  - src/lib/ai/**
  - src/lib/prompts/**
  - src/app/api/og/**
---

# AI 파이프라인 (Claude + Gemini)

**언제 쓰나:** Anthropic/Gemini API 래퍼, 프롬프트 파일, rate limit, AI 결과 캐싱, Dynamic OG를 만질 때.

**Cross-ref:** Server Action 전체 구조는 [nextjs-app-router](../nextjs-app-router/SKILL.md), 얼굴 이미지 signed URL은 [supabase](../supabase/SKILL.md).

---

## 0. 절대 규칙

- **서버에서만 호출.** 클라이언트 번들에 AI 키가 들어가면 안 됨.
- **Rate Limit 통과 후에만** 호출 (edge IP + action user, 2계층).
- **결과 영구 캐싱.** 같은 입력 해시면 API 재호출 금지 — 비용 방어.
- **인라인 프롬프트 금지.** 모든 프롬프트는 `src/lib/prompts/` 파일에서 export.
- **얼굴 참조는 private bucket signed URL**. public URL 사용 금지.

---

## 1. 폴더 레이아웃

```
src/lib/
├── ai/
│   ├── claude.ts            # Anthropic 래퍼
│   ├── gemini.ts            # Gemini Nano Banana 래퍼
│   ├── cache.ts             # 입력 해시 dedupe
│   ├── moderation.ts        # era allowlist + prompt gate
│   └── types.ts
├── prompts/
│   ├── diary/
│   │   ├── generate-story.ts
│   │   ├── generate-body.ts
│   │   └── generate-hashtags.ts
│   └── image/
│       └── generate-scene.ts
└── rate-limit/
    ├── edge.ts              # Middleware (IP)
    └── action.ts            # Server Action (user)
```

---

## 2. 프롬프트 파일 규칙

각 프롬프트는 **타입드 빌더**로 export. 문자열을 여기저기 조립하지 않음.

```ts
// src/lib/prompts/diary/generate-body.ts
import type { Era, CountryCode } from "@/types/domain";

export interface GenerateDiaryBodyInput {
  era: Era;
  countryCode: CountryCode;
  gender: "male" | "female" | "other";
  ageRange: string;
  scenes: string[]; // 이미지 장면 요약
}

export function buildGenerateDiaryBodyPrompt(input: GenerateDiaryBodyInput): string {
  return `당신은 ${input.era} ${input.countryCode}에서 하루를 보낸 사람의 시점으로 일기를 씁니다.
성별: ${input.gender}, 연령대: ${input.ageRange}
오늘 있었던 장면들:
${input.scenes.map((s, i) => `- ${i + 1}. ${s}`).join("\n")}

규칙:
- 한국어, 300~500자
- 1인칭 과거 시제
- 시대 고증 정확하게 (현대 용어 금지)
- 감정/디테일 한 가지씩 구체적으로
`;
}
```

### 규칙

- 파일 1개 = 프롬프트 1개.
- 입력은 항상 `interface <Name>Input` + 빌더 `build<Name>Prompt(input): string`.
- **절대 인라인 백틱으로 AI 호출하는 함수 안에서 작성 금지.**
- 프롬프트 수정 시 이전 버전은 git history에 남기고 파일만 덮어쓰기.

---

## 3. Anthropic Claude 래퍼

```ts
// src/lib/ai/claude.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ClaudeTextInput {
  prompt: string;
  maxTokens?: number;
  system?: string;
}

export async function generateClaudeText({
  prompt,
  maxTokens = 1024,
  system,
}: ClaudeTextInput): Promise<string> {
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("CLAUDE_NO_TEXT");
  return text.text;
}
```

### 규칙

- 모델 ID는 AGENTS.md와 계약된 최신 Sonnet (`claude-sonnet-4-6`) 또는 일기 생성에 맞는 모델. 하드코딩 1곳에서만.
- 재시도는 SDK의 `maxRetries` 옵션에 맡기기(직접 retry 루프 쓰지 말 것).
- streaming이 필요하면 `.messages.stream(...)` 별도 함수로.
- `system` 프롬프트는 `src/lib/prompts/`에 동일 규칙으로.

---

## 4. Gemini 이미지 생성 래퍼

> **TODO: Gemini API 확정 후 구현.**
>
> 구현 전 반드시 확인:
> 1. 실제 모델 ID — [Google AI Studio](https://aistudio.google.com/) 또는 [공식 문서](https://ai.google.dev/gemini-api/docs/image-generation) 에서 확인
> 2. 얼굴 참조 이미지 입력 방식 — `inlineData` vs URL 입력 지원 여부
> 3. 응답에서 이미지 바이트 추출 shape

파일 위치: `src/lib/ai/gemini.ts`

구현 시 지켜야 할 규칙:
- 얼굴 이미지는 **signed URL만** (TTL 60초) — public URL 금지
- **SynthID 워터마크** 자동 포함 → 이용약관에 안내 필요
- `GEMINI_API_KEY`는 서버 전용 env (NEXT_PUBLIC_ 금지)
- 함수 시그니처: `generateSceneImage(input: GenerateSceneImageInput): Promise<ArrayBuffer>`

---

## 5. 입력 해시 영구 캐싱

**동일 입력으로 AI 재호출 금지.** 결과를 DB에 저장하고 해시 키로 조회.

### 스키마

```sql
-- supabase/migrations/NNNN_ai_generations.sql
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  input_hash text unique not null,
  kind text not null,            -- 'diary-body' | 'scene-image' 등
  payload jsonb not null,        -- 텍스트면 {text}, 이미지면 {storage_path}
  created_at timestamptz default now()
);
alter table public.ai_generations enable row level security;
create policy "ai_generations: server only" on public.ai_generations for all using (false);
-- service_role만 접근 (RLS로 유저 차단)
```

### 래퍼

```ts
// src/lib/ai/cache.ts
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin"; // service_role

export function hashInput(kind: string, input: unknown): string {
  return createHash("sha256")
    .update(kind + "::" + JSON.stringify(input))
    .digest("hex");
}

export async function withAiCache<T>(
  kind: string,
  input: unknown,
  run: () => Promise<T>,
  serialize: (value: T) => unknown,
  deserialize: (payload: unknown) => T,
): Promise<T> {
  const supabase = createAdminClient();
  const hash = hashInput(kind, input);

  const { data: hit } = await supabase
    .from("ai_generations")
    .select("payload")
    .eq("input_hash", hash)
    .maybeSingle();

  if (hit) return deserialize(hit.payload);

  const fresh = await run();
  await supabase
    .from("ai_generations")
    .insert({ input_hash: hash, kind, payload: serialize(fresh) });

  return fresh;
}
```

### 사용

```ts
const text = await withAiCache(
  "diary-body",
  input,
  () => generateClaudeText({ prompt: buildGenerateDiaryBodyPrompt(input) }),
  (t) => ({ text: t }),
  (p) => (p as { text: string }).text,
);
```

### 규칙

- 입력을 **정규화**한 뒤 해시 (공백, 순서). 작은 차이로 캐시 miss 나지 않게.
- 이미지 결과는 Storage에 쓰고 `{storage_path}`만 jsonb에 저장.
- 캐시 히트는 비용 0 — **가장 중요한 비용 방어 레이어**.

---

## 6. 2계층 Rate Limit

> **TODO: KV 스토어 연동 후 구현.**
>
> 구현 선택지: [@upstash/ratelimit](https://github.com/upstash/ratelimit-js) (Upstash Redis) 또는 Vercel KV

### 설계 원칙

- **2계층 필수:** edge(IP) + action(user). AI 비용 경로는 반드시 둘 다 통과.
- Edge rate limit은 `src/middleware.ts`에서 AI 경로 진입 전 적용.
- Action rate limit은 Server Action 시작부에 `checkRateLimit()` 호출.

### 파일 위치

```
src/lib/rate-limit/
├── edge.ts    # middleware용 — IP 기반
└── action.ts  # Server Action용 — user 기반
```

### 정책 (초안)

| 경로 | 레이어 | 한도 |
| --- | --- | --- |
| 모든 `/api/**` | edge(IP) | 30 req / min |
| `/time-machine/result/**` | edge(IP) | 10 req / min |
| `createDiary` Server Action | action(user) | 5회 / hour |
| `generateClaudeText` / `generateSceneImage` | cache + action 이후에만 실행 | |

### 인터페이스 (구현 시 맞출 것)

```ts
// edge.ts
export async function edgeRateLimit(request: NextRequest): Promise<boolean>
// true = 제한됨

// action.ts
export async function checkRateLimit(args: { userId: string; key: string }): Promise<{ ok: boolean }>
```

---

## 7. Moderation Gate

프롬프트 **실행 전** 검사. Gemini 호출 전 반드시 통과.

```ts
// src/lib/ai/moderation.ts
const ERA_ALLOWLIST = [
  "1920s", "1930s", "1950s", "1960s", "1970s", "1980s",
  "edo", "joseon", "victorian", "belle-epoque",
] as const;

export function isEraAllowed(era: string): era is (typeof ERA_ALLOWLIST)[number] {
  return (ERA_ALLOWLIST as readonly string[]).includes(era);
}

const BLOCKED_KEYWORDS = ["nsfw", "nude", "gore" /* ... */];

export function hasBlockedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((k) => lower.includes(k));
}

// 민감 시대 (전쟁/식민지/홀로코스트) — 추가 톤 가이드 필요
const SENSITIVE_ERAS: string[] = ["1940s-korea", "1940s-europe"];
export function isSensitiveEra(era: string): boolean {
  return SENSITIVE_ERAS.includes(era);
}
```

### 파이프라인 통합

```ts
if (!isEraAllowed(input.era)) return { ok: false, error: "ERA_NOT_ALLOWED" };
if (hasBlockedContent(input.customPrompt ?? "")) return { ok: false, error: "MODERATION_BLOCK" };
if (isSensitiveEra(input.era)) {
  // 추가 톤 가이드 system 프롬프트 주입
}
```

**feature-guide §리스크 #5, #6** 연동 — allowlist는 시간이 지나면서 확장.

---

## 8. Dynamic OG 이미지

```tsx
// src/app/api/og/[feedId]/route.tsx
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: Promise<{ feedId: string }> }) {
  const { feedId } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("diaries")
    .select("title, era, country_code, diary_images(storage_path, order_index)")
    .eq("id", feedId)
    .eq("is_public", true)
    .single();

  if (!data) return new Response("Not found", { status: 404 });

  const firstImage = data.diary_images.sort((a, b) => a.order_index - b.order_index)[0];
  const imageUrl = firstImage
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/diary-images/${firstImage.storage_path}`
    : undefined;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#111", color: "white" }}>
        {imageUrl && <img src={imageUrl} style={{ width: "50%", objectFit: "cover" }} />}
        <div style={{ padding: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700 }}>{data.title}</div>
          <div style={{ marginTop: 16, opacity: 0.7 }}>
            {data.era} · {data.country_code}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

### 규칙

- **공개(`is_public=true`)된 일기만.**
- `runtime = "edge"` 유지 (Vercel Edge).
- 공개 bucket URL만 사용 (signed URL 금지 — TTL로 OG 캐시 깨짐).
- `ImageResponse`는 CSS 한정적 — 인라인 style만 지원 (Tailwind X).

---

## 9. 비용 측정

feature-guide 기준:
- Flash 이미지: ~$0.02/장
- 피드 1개 (이미지 5 + 텍스트): ~$0.10
- 월 10만원 예산 → ~700 피드

PostHog 이벤트:
- `ai.image.generated` (cache: hit/miss)
- `ai.text.generated` (cache: hit/miss)
- `ai.rate_limited`

**캐시 hit ratio는 대시보드에서 반드시 모니터.** 0%면 해시 정규화 문제.

---

## 체크리스트

- [ ] 프롬프트가 `src/lib/prompts/` 파일에 있고 인라인 아님
- [ ] `withAiCache`로 감쌌음 (텍스트/이미지 모두)
- [ ] `checkRateLimit` 통과 후 호출
- [ ] Gemini 호출 전 `isEraAllowed` + `hasBlockedContent` 통과
- [ ] 얼굴은 signed URL (TTL 60초)
- [ ] 시크릿은 서버 전용, `NEXT_PUBLIC_*` 접두사 없음
- [ ] Nano Banana preview — 수정 전 최신 문서 확인
- [ ] OG 라우트는 `is_public=true` 필터
