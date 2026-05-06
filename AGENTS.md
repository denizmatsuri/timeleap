<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# timeleap — 전역 규칙

> 전역 불변량만 여기에. 스택별 상세 패턴·코드 템플릿은 [.claude/skills/](.claude/skills/) 아래에 있고, 작업 파일 경로에 맞춰 Claude가 자동 로드한다.

## Source of truth

- **기능/스코프/로드맵**: [docs/feature-guide.md](docs/feature-guide.md)
- **전역 규칙**: 이 파일 (AGENTS.md)
- **도메인 패턴**: [.claude/skills/](.claude/skills/) (`paths` 매칭으로 자동 로드)

## 전역 불변 (절대)

- **시크릿은 서버 전용.** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` 등은 클라이언트 번들에 들어가면 안 됨.
- `NEXT_PUBLIC_*` 외 env 접근은 Server Component / Server Action / Route Handler에서만.
- Supabase 모든 테이블에 **RLS 활성화**. 정책 없이 테이블 생성 금지. 유저 데이터는 `auth.uid()` 기반 정책으로.
- Claude / Gemini 호출은 **서버 측에서만** 수행. 클라이언트에서 직접 호출 금지.
- AI 생성 중복 방지는 `generationRequestId`와 `generation_jobs` 기준으로 처리. 같은 `generationRequestId` 재시도는 기존 작업/결과로 수렴해야 함.
- 같은 국가/시대/프로필/사진 입력이라도 사용자가 새 `generationRequestId`로 다시 출발하면 의도적 재생성으로 간주하고 새 AI 호출을 허용.
- 생성 비용 방어가 필요해지면 입력 해시 캐시가 아니라 사용자별 quota / rate limit 정책으로 제어.
- 프롬프트는 `src/lib/prompts/` 아래에만. 인라인 프롬프트 금지.

## 전역 금지

- `any` (불가피하면 `unknown` + narrowing), `var`, 인라인 `style`, 상대 경로 import (`@/` alias만 사용), `console.log` 커밋, 하드코딩된 매직 문자열.
- **API Route는 webhook · 외부 콜백 · Dynamic OG · AI 스트리밍(ReadableStream/SSE)에만.** mutation은 Server Action 우선.
- Server Component에서 `useState` / 브라우저 API 사용.
- `components/ui/*` (shadcn 원본) 직접 수정 — wrapper 컴포넌트로 확장.
- 죽은 코드 / 미사용 import 남기기.

## 타입 원천

- `src/types/db.generated.ts` — `supabase gen types`로 자동 생성, 수동 편집 금지.
- Entity 타입은 `Database["public"]["Tables"][...]["Row"]`에서 추출.
- 도메인 타입은 `src/types/domain.ts`. 컴포넌트 prop 타입은 컴포넌트 옆에 co-locate.
- **경계 검증:** Zod는 Server Action / Route Handler 입력 경계에서만. 내부 함수는 TS 타입 신뢰.

## 파일 네이밍 (최소)

- 파일: kebab-case (`post-item.tsx`, `use-create-diary.ts`)
- 컴포넌트: PascalCase
- 훅: `use-` 접두사
- 이벤트 핸들러: `handle[Verb][Target]` (예: `handleSubmitDiary`)
- Server Action: 동사로 시작 (예: `createDiary`, `toggleLike`)

## 주석

- "왜"만 적는다. "무엇/어떻게"는 코드가 말한다.
- 과한 방어적 코딩 금지. 검증은 경계(유저 입력, 외부 API)에서만.

## 작업 전 확인

- Next.js 16은 훈련 데이터와 다를 수 있음 — API 수정 전 `node_modules/next/dist/docs/` 관련 가이드 확인.
- 새 테이블/컬럼 → RLS 정책도 같이 작성.
- 새 외부 호출(AI, 외부 API) → 서버 전용 경로인지, quota / rate limit 정책이 필요한지 확인.

## 커밋

- prefix: `feat` / `fix` / `refactor` / `chore` / `docs`
- 메시지는 한국어 가능, **"왜"를 담기**.
- `.claude/plans/`는 로컬 전용, 커밋 금지.
