# Timeleap Architecture

Next.js 16 App Router 기반이다. 라우팅은 `src/app`, 서버 공통 로직은
`src/lib`, mutation은 `src/actions`, 재사용 UI는 `src/components` 또는
도메인별 feature 폴더에 둔다.

Next.js 16 문서 기준으로 layout은 여러 페이지가 공유하는 UI를 감싸는 용도다.
URL에 영향을 주지 않고 route를 묶을 때는 route group `(group)`을 사용한다.

## 현재 구조

```text
src/
  app/
    layout.tsx                         # html/body, font, metadata
    page.tsx                           # 랜딩
    auth/callback/route.ts             # OAuth callback
    login/page.tsx
    onboarding/page.tsx
    time-machine/page.tsx
    time-machine/result/page.tsx       # query string 기반 생성 연출
    diary/[id]/page.tsx
    me/page.tsx                        # 프로필 + 내 Diary 목록
    (site)/diaries/page.tsx             # 공개 Diary 목록
  actions/
    auth.ts
    diary.ts
    time-machine.ts
  components/
    layout/site-header.tsx
  lib/
    ai/gemini.ts
    auth/
    cache/
    diaries/server.ts
    prompts/
    supabase/
    time-machine/
  types/
    database.types.ts
  proxy.ts
```

현재 root layout은 전역 font/html/body만 담당한다. 여러 page에서
`SiteHeader`와 `bg-paper text-ink relative min-h-dvh overflow-x-hidden`
같은 shell을 반복하고 있으므로 App Router layout 장점을 충분히 쓰지 못하고 있다.

## 목표 구조

```text
src/
  app/
    layout.tsx                         # html/body, fonts, global providers
    (site)/
      layout.tsx                       # public shell: header, background
      page.tsx
      login/page.tsx
      diaries/page.tsx                  # 공개 Diary 목록
      diaries/[id]/page.tsx             # 공개 Diary 상세
    (protected)/
      layout.tsx                       # auth-required shell or guard boundary
      onboarding/page.tsx
      time-machine/page.tsx
      time-machine/result/[id]/page.tsx
      me/page.tsx
      me/diaries/page.tsx
      me/settings/page.tsx
    auth/callback/route.ts
    api/og/[feedId]/route.ts
  features/
    diaries/
      components/
      server/
      format.ts
    onboarding/
      components/
      hooks/
    time-machine/
      components/
      data/
      lib/
  actions/
  components/
    layout/
    shared/
    ui/
  lib/
  types/
```

`(site)`와 `(protected)`는 URL에 포함되지 않는다. 예를 들어
`src/app/(site)/diaries/page.tsx`는 `/diaries`다.

## Layer Rules

| 레이어 | 위치 | 역할 |
| --- | --- | --- |
| Route | `src/app/**/page.tsx` | 데이터 조회, redirect, 화면 조립 |
| Layout/Template | `src/app/**/layout.tsx`, `template.tsx` | route 묶음의 공통 shell |
| Route Handler | `src/app/**/route.ts` | OAuth callback, webhook, Dynamic OG, streaming API |
| Server Action | `src/actions/*.ts` | mutation, AI 생성, form action |
| Feature | `src/features/*` | 도메인 UI, 데이터, format/helper |
| Shared Component | `src/components/*` | 도메인과 무관한 공통 UI |
| Lib | `src/lib/*` | 외부 클라이언트, 서버 유틸, 캐시, auth helper |
| Type | `src/types/*` | generated DB type, 공통 domain type |

## Dependency Direction

허용 방향:

```text
app -> actions
app -> features
app -> components
app -> lib
actions -> lib
features -> lib
components -> lib only when generic helper is needed
lib -> types
```

피해야 할 방향:

```text
lib -> app
actions -> app
shared components -> app route-private files
```

현재 `src/lib/time-machine/destination.ts`가
`src/app/time-machine/_data/time-machine-destinations.ts`에 의존한다. 이 데이터는
route-private 성격이 아니므로 `src/features/time-machine/data` 또는
`src/lib/time-machine`로 옮겨야 한다.

## Layout Strategy

`src/app/layout.tsx`:

- `<html>`, `<body>` 필수 태그
- font variable
- global metadata
- 전역 provider가 생기면 이곳 또는 dedicated provider component에서 연결

`src/app/(site)/layout.tsx`:

- 랜딩, 로그인, 공개 Diary 목록, 공개 Diary 상세의 공통 배경
- `SiteHeader`
- public shell

`src/app/(protected)/layout.tsx`:

- 로그인 사용자 전용 화면의 공통 배경
- 실제 접근 차단은 `src/proxy.ts`에서 `/onboarding`, `/me`, `/time-machine` 경로를
  검사해서 처리한다.
- `src/lib/supabase/proxy.ts`는 Supabase 세션 갱신과 user 조회만 담당한다.
- page는 데이터 접근 직전 `supabase.auth.getUser()`로 다시 확인한다.
- header의 사용자 상태가 navigation 중 stale해질 수 있으면 `template.tsx` 또는 별도
  server boundary를 검토한다.

## Page Size Rule

`page.tsx`는 다음 정도만 담당한다.

- `params`, `searchParams` 해석
- 인증 확인과 redirect
- 서버 데이터 조회
- domain view component에 props 전달

다음은 page에서 분리한다.

- 100줄 이상의 UI 마크업
- 날짜/문구 formatting helper
- Diary card/list rendering
- 상수 데이터
- client interaction

현재 분리 우선순위:

1. `src/app/me/page.tsx`
2. `src/app/page.tsx`
3. `src/app/(site)/diaries/[id]/page.tsx`
4. `src/app/time-machine/_components/time-machine-studio.tsx`
5. `src/app/time-machine/_data/time-machine-destinations.ts`

## Data And AI

- Supabase server client는 Server Component, Server Action, Route Handler에서만 사용한다.
- Supabase browser client는 Client Component/hook에서만 사용한다.
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`는 클라이언트 번들에
  들어가면 안 된다.
- AI 호출은 Server Action 또는 서버 전용 lib를 통해서만 한다.
- 프롬프트는 `src/lib/prompts/` 아래에만 둔다.
- 같은 생성 요청은 `generationRequestId`와 `generation_jobs`로 중복 호출을 방지한다.
- 같은 입력이라도 새 `generationRequestId`로 출발한 요청은 의도적 재생성으로 보고 새 AI 호출을 허용한다.
- 비용 방어는 input hash cache가 아니라 사용자별 quota / rate limit 정책으로 제어한다.

## Caching

| 대상 | 전략 | 메모 |
| --- | --- | --- |
| `/diaries` | ISR 또는 tag revalidate 목표 | 공개 Diary 목록 |
| `/diaries/[id]` | ISR 또는 tag revalidate 목표 | 공개 전용 Diary 상세 |
| 공개 Diary 목록 | `PUBLIC_FEED_CACHE_TAG` | 공개 전환/삭제 시 revalidate |
| AI 생성 결과 | DB 영구 저장 | 같은 requestId 중복 생성 방지, 새 requestId 재생성 허용 |
| 좋아요/조회수 | client fetch 예정 | ISR 본문과 분리 |

## Auth And Security

- `src/proxy.ts`는 Supabase 세션 refresh 진입점이다.
- protected page와 action은 `supabase.auth.getUser()`로 다시 인증한다.
- 모든 사용자 데이터 테이블은 RLS를 켠다.
- generated type은 `src/types/database.types.ts`만 원천으로 삼고 수동 편집하지 않는다.