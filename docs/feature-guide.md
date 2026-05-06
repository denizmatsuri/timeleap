# Timeleap Feature Guide

이 문서가 기능, 스코프, 라우팅 로드맵의 기준이다. 구현 세부 구조는
`docs/ARCHITECTURE.md`, 작업 현황은 `docs/TASKS.md`를 따른다.

## 제품 요약

Timeleap은 사용자의 얼굴 사진을 바탕으로 특정 시대와 국가에서 보낸 하루를
AI 이미지와 짧은 일기로 생성하는 서비스다. 생성된 기록은 개인 보관하거나 공개
갤러리에 공유할 수 있다.

## 핵심 플로우

```text
랜딩 / 공개 Diary 목록
-> Google 로그인
-> 최초 온보딩: 얼굴 사진, 닉네임, 성별, 연령대
-> 타임머신: 국가와 시대 선택
-> 생성 연출: 대표 이미지 + 일기 생성
-> Diary 상세: 공개 전환, 공유, 삭제
-> 내 프로필: 얼굴 사진, 여행 기록, 공개/비공개 필터
```

## 현재 구현된 MVP

- 랜딩 페이지 `/`
- Google OAuth 로그인 `/login`, `/auth/callback`
- 온보딩 `/onboarding`
  - 얼굴 사진 1~10장 업로드
  - 닉네임, 성별, 연령대 저장
  - 완료 여부는 `profiles.onboarding_completed_at` 기준
- 타임머신 선택 `/time-machine`
  - 국가/시대 선택
  - 랜덤 선택
  - 클라이언트 인터랙션 기반 지구본 UI
- 생성 연출 `/time-machine/result?country=...&era=...&requestId=...`
  - Server Action에서 Gemini 이미지/텍스트 생성
  - `generation_jobs` 기반 중복 요청 상태 확인
  - 완료 후 `/diaries/[id]`로 이동
- Diary 상세 `/diaries/[id]`
  - 소유자 또는 공개 Diary만 접근
  - 대표 이미지 signed URL 렌더링
  - 공개/비공개 토글
  - 삭제
- 내 프로필 `/me`
  - 프로필 카드
  - 얼굴 대표 사진
  - 내 Diary 목록
  - 공개/비공개 필터
- 공개 Diary 목록 `/diaries`
  - 공개 Diary 최신순 목록

## 아직 남은 기능

- `/me/diaries`와 `/me/settings` 분리
- `/diaries/country/[code]`, `/diaries/era/[era]` 필터
- 공개 전용 상세 URL `/diaries/[id]`
- 다른 유저 공개 프로필 `/u/[username]`
- 좋아요, 댓글, 조회수
- Dynamic OG `/api/og/[feedId]`
- 주간 quota / rate limit
- 개인정보 처리방침, 이용약관
- `loading.tsx`, `error.tsx`, `not-found.tsx`
- 운영 전 generated type 동기화 점검

## 라우팅 기준

### 현재 라우팅

```text
/                         랜딩
/login                    로그인
/auth/callback            OAuth callback route handler
/onboarding               최초 온보딩
/time-machine             국가/시대 선택
/time-machine/result      생성 연출, query string 기반 requestId
/diaries/[id]             Diary 상세 및 소유자 관리
/me                       내 프로필 + 내 Diary 목록
/diaries                  공개 Diary 목록
```

### 목표 라우팅

```text
/                         랜딩
/login                    로그인
/auth/callback            OAuth callback route handler
/onboarding               최초 온보딩

/time-machine             국가/시대 선택
/time-machine/result/[id] 생성 연출 및 생성 상태 복구

/me                       내 프로필
/me/diaries               내 Diary 목록
/me/settings              계정/얼굴 사진 관리
/diaries                  공개 Diary 목록
/diaries/[id]             공개 전용 Diary 상세
/diaries/country/[code]   국가별 공개 Diary 목록
/diaries/era/[era]        시대별 공개 Diary 목록
/u/[username]             다른 유저 공개 프로필

/api/og/[feedId]          Dynamic OG
```

## 기능 영역

### 인증 / 온보딩

- Supabase Auth Google OAuth를 사용한다.
- OAuth callback은 Route Handler가 담당한다.
- 세션 refresh는 `src/proxy.ts`와 `src/lib/supabase/proxy.ts`가 담당한다.
- 실제 접근 제어는 Server Component 또는 Server Action에서 `getUser()`로 다시 확인한다.

### 얼굴 사진

- 업로드 대상은 `face-images` Storage bucket이다.
- 파일 선택, preview, 기본 검증은 클라이언트에서 한다.
- 최종 완료 여부는 서버가 DB 기준으로 다시 검증한다.
- 클라이언트가 전달한 사진 목록만 믿지 않는다.

### 타임머신 생성

- 생성 시작은 Server Action `generateDiaryFromSelection`을 통해서만 한다.
- Gemini API key는 서버 전용이다.
- 프롬프트는 `src/lib/prompts/` 아래에서만 관리한다.
- 결과는 `diaries`에 완성본으로 저장한다.
- 같은 `generationRequestId`는 같은 생성 요청으로 취급한다.
- 같은 `generationRequestId` 재시도는 기존 생성 작업 또는 결과로 수렴시킨다.
- 같은 국가/시대/프로필/사진 입력이라도 사용자가 새 `generationRequestId`로 다시 출발하면 의도적 재생성으로 보고 새 결과 생성을 허용한다.
- MVP에서는 같은 입력의 재생성을 input hash cache로 막지 않는다. 비용 방어가 필요해지면 사용자별 quota / rate limit 정책으로 제어한다.

### Diary

- Diary는 소유자만 수정/삭제할 수 있다.
- 비공개 Diary는 소유자만 조회할 수 있다.
- 공개 Diary는 `/diaries`와 `/diaries/[id]`에 노출한다.
- 공개 상태 변경 후 관련 path/tag를 revalidate한다.

### 공개 Diary 목록

- `/diaries`는 공개 Diary 목록이다. nav label은 계속 "둘러보기"처럼 표현해도 된다.
- country/era 필터와 인기순 정렬은 아직 미구현이다.
- 좋아요/조회수처럼 자주 바뀌는 값은 ISR 본문과 분리한다.

## 기술 매핑

| 기술 | 사용처 | 기준 |
| --- | --- | --- |
| App Router | 전체 라우팅 | `src/app` 파일 기반 라우팅 |
| Layout | route group별 공유 shell | 반복 header/page shell 제거 |
| Server Component | page 데이터 조회 | DB 접근과 redirect 처리 |
| Client Component | 업로드, 지구본, 생성 연출 | 브라우저 상태/이벤트 처리 |
| Server Action | mutation, AI 생성 | API Route 대신 우선 사용 |
| Route Handler | OAuth callback, Dynamic OG, webhook | 외부 callback/API 성격만 허용 |
| Supabase RLS | 모든 사용자 데이터 | `auth.uid()` 기반 정책 필수 |
| `revalidatePath`/`revalidateTag` | Diary 공개/삭제 | 공개 표면 무효화 |

## 현재 구조 리팩토링 방향

- `(site)`와 `(protected)` route group으로 shell을 나눈다.
- `SiteHeader` 반복 렌더링을 group layout 또는 template으로 이동한다.
- `src/app/**/_data`에 둔 도메인 데이터는 `src/features` 또는 `src/lib`로 옮긴다.
- 큰 `page.tsx`는 데이터 fetch + 조립만 남기고 UI는 도메인 컴포넌트로 분리한다.
- `/me` 안의 Diary 목록은 장기적으로 `/me/diaries`로 분리한다.
- 생성 연출 route는 query string 기반에서 `/time-machine/result/[id]`로 옮겨 복구 가능한 URL로 만든다.
