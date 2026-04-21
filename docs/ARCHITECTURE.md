# Timeleap — 파일 구조

Next.js 16 App Router 기반. 도메인별 co-location 우선, 공유 레이어는 `src/lib` / `src/components`에 모은다.

> 아래 트리는 **프로젝트 전체 목표 구조**를 기준으로 한다.  
> 현재 구현된 인증 베이스만 일부 실제 파일 기준으로 반영했다.

---

## 디렉터리 트리

```text
timeleap/
├── src/
│   ├── app/                          # 라우팅 루트 (Next.js App Router)
│   │   ├── layout.tsx                # 전역 레이아웃 (폰트, 테마, Provider)
│   │   ├── page.tsx                  # / 랜딩
│   │   ├── error.tsx                 # 전역 에러 UI
│   │   ├── loading.tsx               # 전역 로딩 UI
│   │   │
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # Google OAuth callback
│   │   │
│   │   ├── login/
│   │   │   ├── _components/
│   │   │   │   └── google-sign-in-button.tsx
│   │   │   └── page.tsx              # Google 소셜 로그인
│   │   │
│   │   ├── onboarding/
│   │   │   ├── _components/
│   │   │   │   └── onboarding-form.tsx
│   │   │   └── page.tsx              # 최초 온보딩 (얼굴·닉네임·성별·연령대)
│   │   │
│   │   ├── time-machine/
│   │   │   ├── page.tsx              # 시대/국가 선택 UI
│   │   │   └── result/
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # 타임머신 애니메이션 + 스트리밍 결과
│   │   │           └── loading.tsx   # 타임머신 연출 스켈레톤
│   │   │
│   │   ├── me/
│   │   │   ├── page.tsx              # /me 내 프로필
│   │   │   ├── diaries/
│   │   │   │   ├── page.tsx          # 내 일기 목록
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # 내 일기 상세 / 편집
│   │   │   └── settings/
│   │   │       └── page.tsx          # 설정 (얼굴 재업로드, 계정 삭제)
│   │   │
│   │   ├── explore/
│   │   │   ├── page.tsx              # 공개 갤러리 (ISR)
│   │   │   ├── country/
│   │   │   │   └── [code]/
│   │   │   │       └── page.tsx      # 국가별 필터 (ISR)
│   │   │   └── era/
│   │   │       └── [era]/
│   │   │           └── page.tsx      # 시대별 필터 (ISR)
│   │   │
│   │   ├── feed/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # 공개 일기 상세 (ISR)
│   │   │
│   │   ├── u/
│   │   │   └── [username]/
│   │   │       └── page.tsx          # 다른 유저 공개 프로필 (ISR)
│   │   │
│   │   └── api/
│   │       └── og/
│   │           └── [feedId]/
│   │               └── route.ts      # Dynamic OG 이미지
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 원본 (직접 수정 금지)
│   │   ├── layout/
│   │   │   ├── nav.tsx
│   │   │   └── footer.tsx
│   │   ├── diary/
│   │   │   ├── diary-card.tsx        # 갤러리용 카드
│   │   │   ├── diary-detail.tsx      # 상세 뷰
│   │   │   └── diary-image-strip.tsx # 사진 3~5장 스트립
│   │   ├── time-machine/
│   │   │   ├── era-selector.tsx      # 시대 선택 UI
│   │   │   ├── country-selector.tsx  # 국가 선택 UI
│   │   │   └── warp-animation.tsx    # 타임머신 연출 애니메이션
│   │   ├── feed/
│   │   │   ├── feed-grid.tsx         # 공개 피드 그리드
│   │   │   └── like-button.tsx       # 좋아요 토글 (useOptimistic)
│   │   ├── onboarding/
│   │   │   └── face-uploader.tsx     # 얼굴 사진 업로드 + 검증 UI
│   │   └── shared/
│   │       ├── ticket.tsx            # 보딩패스 티켓 컴포넌트
│   │       └── era-badge.tsx         # 시대·국가 배지
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # 브라우저용 Supabase 클라이언트
│   │   │   ├── server.ts             # 서버용 (Server Component / Action)
│   │   │   └── proxy.ts              # proxy.ts에서 쓰는 세션 갱신 유틸
│   │   ├── auth/
│   │   │   ├── redirect.ts           # next 파라미터 정규화
│   │   │   └── profile-options.ts    # 성별/연령대 옵션 상수
│   │   ├── ai/
│   │   │   ├── pipeline.ts           # 생성 파이프라인 오케스트레이터
│   │   │   ├── gemini.ts             # Gemini 이미지 생성
│   │   │   └── claude.ts             # Claude 텍스트 생성
│   │   ├── prompts/
│   │   │   ├── diary-text.ts         # 일기 본문 프롬프트
│   │   │   └── image-scene.ts        # 이미지 씬 프롬프트
│   │   ├── cache/
│   │   │   └── keys.ts               # revalidateTag 키 상수
│   │   └── rate-limit/
│   │       └── index.ts              # Rate Limiting 유틸
│   │
│   ├── actions/
│   │   ├── auth.ts                   # signInWithGoogle / signOut / completeOnboarding
│   │   ├── diary.ts                  # createDiary / deleteDiary / togglePublic
│   │   ├── time-machine.ts           # triggerTimeMachine (생성 파이프라인)
│   │   └── like.ts                   # toggleLike
│   │
│   ├── stores/                       # Zustand — 클라이언트 전역 상태
│   │   ├── time-machine-store.ts     # 시대/국가 선택 상태, 생성 진행 단계
│   │   └── ui-store.ts               # 모달·토스트 등 전역 UI 상태
│   │
│   ├── hooks/
│   │   ├── use-optimistic-like.ts
│   │   ├── use-face-upload.ts
│   │   ├── use-public-feed.ts        # TanStack Query: 공개 피드 (좋아요 수 등 실시간)
│   │   └── use-diary-likes.ts        # TanStack Query: 내 좋아요 여부
│   │
│   ├── providers/
│   │   └── query-provider.tsx        # QueryClientProvider — app/layout.tsx에서 마운트
│   │
│   └── types/
│       ├── database.types.ts         # supabase gen types — 수동 편집 금지
│       └── domain.ts                 # Era, Country, DiaryWithImages 등
│
├── src/proxy.ts                      # 세션 refresh 및 전단 처리 진입점
│
├── public/
│   └── images/
│
└── docs/
    ├── ARCHITECTURE.md               # 이 파일
    ├── FEATURES.md
    └── TASKS.md
```

---

## 레이어 역할

| 레이어 | 위치 | 역할 |
|---|---|---|
| **Route** | `app/**/page.tsx` | 데이터 fetch + 레이아웃 조립 (Server Component) |
| **Action** | `src/actions/*.ts` | mutation (Server Action) — API Route 대신 |
| **Component** | `src/components/` | 순수 UI, 도메인별 분리 |
| **Lib** | `src/lib/` | 외부 클라이언트, AI, 캐시, Rate Limit |
| **Store** | `src/stores/` | 클라이언트 전역 상태 (Zustand) — URL로 표현 안 되는 흐름 상태 |
| **Hook** | `src/hooks/` | 서버 데이터 구독 (TanStack Query) + `useOptimistic` |
| **Provider** | `src/providers/` | React context 진입점 (QueryClientProvider 등) |
| **Type** | `src/types/` | DB 생성 타입 + 도메인 타입 |

---

## 캐싱 레이어 매핑

| 캐시 종류 | 위치 | 대상 |
|---|---|---|
| ISR (`revalidate`) | `app/explore`, `app/feed/[id]`, `app/u/[username]` | 공개 콘텐츠 |
| `unstable_cache` | `src/lib/ai/pipeline.ts` | AI 생성 결과 (입력 해시 키) |
| `revalidateTag` | `src/actions/diary.ts` | 공개 전환·삭제 시 피드 무효화 |
| Client Fetch | `src/hooks/` | 좋아요 수, 내 좋아요 여부 (실시간) |

---

## 라우팅 타입별 렌더링 전략

| 경로 | 전략 | 이유 |
|---|---|---|
| `/` | SSR | 동적 stat(여행 수 등) 포함 |
| `/explore`, `/feed/[id]` | ISR | 공개 콘텐츠 SEO + 캐시 |
| `/u/[username]` | ISR | 공개 프로필 SEO |
| `/time-machine/result/[id]` | Streaming SSR | AI 결과 순차 출력 연출 |
| `/me/*` | SSR (auth guard) | 개인 데이터 |
| `/api/og/[feedId]` | Route Handler | Dynamic OG (외부 콜백 패턴) |
| `/auth/callback` | Route Handler | OAuth callback |

---

## 인증 / 세션 관리 메모

- Next.js 16 기준으로 전단 처리 파일은 `middleware.ts` 대신 `src/proxy.ts`를 사용
- `src/lib/supabase/proxy.ts`는 요청 초기에 세션을 갱신하는 역할
- 실제 접근 제어는 `src/app/**/page.tsx`와 `src/actions/auth.ts` 안에서 `supabase.auth.getUser()`로 다시 검사
- 세션의 source of truth는 Supabase Auth cookie
- 온보딩 완료 여부는 `profiles.onboarding_completed_at`으로 판단

---

## 주요 불변

- `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` — 서버 전용, 클라이언트 번들 불가
- `components/ui/*` 직접 수정 금지 — wrapper로 확장
- AI 호출은 `src/lib/ai/` → `src/actions/` 경로만, 클라이언트 직접 호출 금지
- 새 테이블 생성 시 RLS 정책 동시 작성
- 프롬프트는 `src/lib/prompts/` 에만
