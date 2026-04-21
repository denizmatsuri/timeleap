# 🕰 타임머신 일기 — 기능 가이드 (v0.2)

## 📌 프로젝트 개요

**한 줄 소개** 내 얼굴 사진으로 과거 특정 시대/나라에서의 하루를 사진과 일기로 받아보는 서비스.

**컨셉** 타임머신에 내 사진을 넣으면, 과거 어느 날의 나로 살아본 하루가 사진 여러 장과 일기로 생성된다. 원하면 공개해서 다른 사람들과 공유할 수 있다.

**포지셔닝**

- 포트폴리오 + 상업화 가능성 있는 MVP

---

## 🎯 핵심 사용자 플로우

```
1. 랜딩 페이지 진입
   └ 공개 갤러리 샘플 보기 가능 (비로그인도 OK)

2. Google 로그인
   └ Supabase OAuth 시작 → `/auth/callback`에서 세션 쿠키 확정

3. 최초 온보딩
   └ 얼굴 사진 업로드 (1~3장)
   └ 닉네임, 성별, 연령대

4. 타임머신 돌리기
   └ 시대 선택 (또는 랜덤)
   └ 국가 선택 (또는 랜덤)
   └ "출발" 버튼

5. 생성 (Streaming)
   └ 타임머신 작동 연출
   └ 사진 1장씩 순차 생성
   └ 일기 본문 타이핑되듯 출력

6. 결과 확인
   └ 사진 3~5장 + 일기
   └ 공개/비공개 선택
   └ 공유 / 저장 / 삭제

7. 반복
   └ "다시 떠나기" → 새로운 시대로
   └ 내 여행 기록에 모두 저장됨
```

---

## 📋 기능 목록

### A. 인증 / 온보딩

- **A1. 랜딩 페이지** — 비로그인도 공개 갤러리 샘플 접근 가능
- **A2. Google 소셜 로그인** — Supabase Auth
- **A3. 온보딩** — 얼굴 사진, 닉네임, 성별, 연령대 입력
- **A4. 프로필 수정** — 얼굴 사진 재업로드, 정보 변경
- **A5. 계정 / 데이터 삭제** — 얼굴 데이터 완전 삭제

### B. 얼굴 처리

- **B1. 사진 업로드** — Supabase Storage
- **B2. 얼굴 검증** — 얼굴 감지 / 선명도 체크
- **B3. 얼굴 정보 저장** — 재사용을 위한 임베딩 또는 reference image

### C. 타임머신 (핵심)

- **C1. 시대 / 국가 선택 UI** — 랜덤 또는 수동
- **C2. "출발" 액션** — Server Action으로 생성 파이프라인 트리거
- **C3. 타임머신 연출** — 로딩 인터랙션
- **C4. AI 생성 파이프라인**
  - 시대/국가 기반 하루 스토리 생성
  - 얼굴 합성 이미지 3~5장
  - 일기 본문 생성
  - 해시태그 / 메타데이터
- **C5. 스트리밍 결과 출력** — 사진 → 일기 순차 노출

### D. 일기 CRUD

- **D1. Create** — 타임머신 결과물 저장
- **D2. Read** — 내 일기 목록 / 상세
- **D3. Update** — 공개/비공개 토글
- **D4. Delete** — 삭제 (이미지 포함 정리)

### E. 내 프로필 / 여행 기록

- **E1. 내 프로필** `/me` — 얼굴 사진, 닉네임, 여행 횟수
- **E2. 내 여행 기록** — 다녀온 시대/국가별 일기 목록
- **E3. 여행 상세** — 개별 일기 보기

### F. 공개 갤러리 (ISR 적용)

- **F1. 전체 공개 피드** `/explore` — 최신순 / 인기순
- **F2. 국가별 필터** `/explore/country/[code]`
- **F3. 시대별 필터** `/explore/era/[era]`
- **F4. 일기 상세 (공개)** `/feed/[id]`
- **F5. 다른 유저 공개 프로필** `/u/[username]`

### G. 인터랙션 (동적 레이어)

- **G1. 좋아요** — 클라이언트에서 토글
- **G2. 댓글** (MVP 포함 여부 결정 필요)
- **G3. 조회수** (선택)

### H. 공유 / 바이럴

- **H1. 공유 링크** — 일기 상세 URL
- **H2. Dynamic OG 이미지** — `/api/og/[feedId]`
- **H3. SNS 공유 버튼** — X, 카톡, 링크 복사

### I. 시스템 / UX

- **I1. 반응형 디자인** (모바일 우선)
- **I2. 다크모드**
- **I3. 에러 페이지** (세계관 반영)
- **I4. 로딩 상태 / Skeleton UI**
- **I5. Rate Limiting** — AI 비용 방어
- **I6. 사용량 추적**
- **I7. 개인정보 처리방침 / 이용약관**

---

## 🛠 기술 스택

| 영역                | 선택                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| 프레임워크          | Next.js 16 (App Router)                                                                                      |
| 언어                | TypeScript                                                                                                   |
| UI                  | Tailwind CSS + shadcn/ui                                                                                     |
| 애니메이션          | Framer Motion                                                                                                |
| DB / Auth / Storage | Supabase                                                                                                     |
| 상태 관리           | Zustand + TanStack Query                                                                                     |
| AI 텍스트           | Anthropic Claude API                                                                                         |
| AI 이미지           | Google Gemini API — Nano Banana 2 (gemini-3.1-flash-image-preview), <br>필요 시 Nano Banana Pro로 업그레이드 |
| 배포                | Vercel                                                                                                       |
| 분석                | Vercel Analytics + PostHog                                                                                   |

---

## 🗺 페이지 / 라우팅 구조

```
/                        랜딩 페이지
/login                   로그인
/onboarding              최초 온보딩

/time-machine            타임머신 (시대/국가 선택)
/time-machine/result/[id]  로딩(타임머신 애니메이션) + 생성 결과 (스트리밍)

/me                      내 프로필
/me/diaries              내 일기 목록
/me/diaries/[id]         내 일기 상세 / 편집
/me/settings             설정

/explore                 공개 갤러리 (ISR)
/explore/country/[code]  국가별 (ISR)
/explore/era/[era]       시대별 (ISR)
/feed/[id]               공개 일기 상세 (ISR)
/u/[username]            다른 유저 공개 프로필 (ISR)

/api/og/[feedId]         Dynamic OG 이미지
```

---

## 🎨 Next.js 기술 매핑

| 기술                        | 사용처                                  | 목적                   |
| --------------------------- | --------------------------------------- | ---------------------- |
| **App Router**              | 전체 라우팅                             | 파일 기반 구조         |
| **Server Components**       | 피드 목록, 프로필                       | 서버에서 데이터 fetch  |
| **Server Actions**          | 타임머신 실행, 일기 CRUD                | 폼 기반 mutation       |
| **Streaming SSR**           | AI 결과 순차 출력                       | 과거에서 전송되는 연출 |
| **ISR**                     | `/explore`, `/feed/[id]` 등 공개 페이지 | 공개 콘텐츠 캐싱 + SEO |
| **`revalidateTag`**         | 공개 전환 / 새 일기 시                  | 선택적 캐시 무효화     |
| **`unstable_cache`**        | AI 결과, 시대 메타데이터                | 비용/속도 최적화       |
| **`proxy.ts` + 서버 auth check** | 세션 refresh, 인증 가드, 전단 제어        | 보안 / 비용 방어       |
| **useOptimistic**           | 좋아요, 삭제, 수정                      | 즉각 피드백            |
| **Dynamic OG**              | `/api/og/[feedId]`                      | 공유 카드              |
| **next/image**              | 모든 이미지                             | 최적화                 |
| **loading.tsx / error.tsx** | 전역                                    | 세계관 반영 상태 UI    |

---

## 🧩 캐싱 전략 (계층 분리)

```
┌─ 정적 캐싱 (ISR) ────────────
│  일기 본문, 이미지, 메타데이터
│  → 거의 안 바뀜
│  → revalidate로 신선도 유지

┌─ 요청 캐싱 (fetch cache / unstable_cache) ──
│  시대 배경 데이터, Wikipedia 조회
│  → 서비스 전체에서 공유

┌─ 동적 (Client Fetch) ────────
│  좋아요 수, 내 좋아요 여부
│  → 실시간성 필요
│  → ISR 캐시에 포함 X

┌─ 무효화 ──────────────────
│  일기 공개 전환 → revalidateTag('feed-list')
│  일기 수정 → revalidatePath(`/feed/${id}`)
```

---

## 🎨 AI 이미지 생성 파이프라인

**모델**: Nano Banana 2 (gemini-3.1-flash-image-preview)

- 필요 시 Nano Banana Pro로 업그레이드 가능

**입력**

- 사용자 얼굴 참조 이미지 1~3장 (Supabase Storage에서 조회)
- 시대 / 국가 / 상황 컨텍스트 (프롬프트)
- 성별, 연령대 힌트

**출력**

- 하루를 구성하는 사진 3~5장
- 피드별로 인물 일관성 유지

**비용**

- Flash 기준 이미지당 약 $0.02
- 피드 1개 (5장) = 약 $0.10
- 월 10만원 예산 → 약 700개 피드 여유

**주의사항**

- SynthID 워터마크 자동 포함
- Preview 단계 → API 스펙 변경 가능성
- Rate Limiting 필수

---

## 🗓 개발 단계 (3~4주 MVP)

### Week 1: 기반

- 프로젝트 세팅 (Next.js 16, TS, Tailwind, shadcn)
- Supabase 연동 (Auth, DB 기본 스키마)
- Google 로그인, 온보딩 플로우
- 얼굴 사진 업로드

### Week 2: 핵심 파이프라인

- Nano Banana 2 API 연동 및 프롬프트 엔지니어링
- 타임머신 Server Action
- Streaming UI (사진/일기 순차 출력)
- 일기 저장 (Create)

### Week 3: CRUD + 갤러리

- 내 일기 목록/상세/수정/삭제
- 공개 갤러리 (`/explore`) — ISR 적용
- 필터 페이지 (국가/시대)
- 좋아요 기능

### Week 4: 폴리싱

- 랜딩 페이지
- Dynamic OG
- 반응형, 다크모드
- 에러/로딩 UI
- Rate Limiting
- 배포

---

## 🗂 데이터베이스 스키마 (초안)

```
users
├ id (auth.users 참조)
├ nickname
├ face_image_url
├ face_reference_data (임베딩 or URL)
├ gender, age_range
├ created_at

diaries
├ id
├ user_id
├ era (e.g., "1960s")
├ country_code (e.g., "US")
├ title
├ body (일기 본문)
├ hashtags
├ is_public (boolean)
├ created_at
├ updated_at

diary_images
├ id
├ diary_id
├ image_url
├ order_index
├ caption (선택)

likes
├ id
├ diary_id
├ user_id
├ created_at
```

---

## ⚠️ 리스크 / 선결 과제

1. **얼굴 이미지 생성 품질 검증** — Google AI Studio에서 Nano Banana 2 POC 먼저 (얼굴 일관성, 아시아 얼굴 품질, 시대 고증 정확도 확인)
2. **AI 비용 관리** — Rate Limiting 초기부터 적용
3. **개인정보 처리** — 얼굴 데이터 저장/삭제 정책 명확히
4. **저작권 / 초상권** — 본인 얼굴만 업로드 동의 절차
5. **콘텐츠 모더레이션** — NSFW 필터, 민감 시대 가이드라인
6. **시대 선택 민감도** — 전쟁, 식민지, 홀로코스트 등 제한 또는 톤 관리
7. **Nano Banana Preview 상태** — 실서비스 런칭 시점에 정식 출시 여부 재확인
8. **SynthID 워터마크** — 모든 생성 이미지에 Google의 비가시 워터마크 포함 (서비스 컨셉상 문제 없지만 인지 필요)

---

## 💡 포트폴리오 서사 포인트

README / 블로그에 정리할 핵심 스토리:

- **"왜 ISR?"** → 공개 콘텐츠 + SEO + 캐싱 효율
- **"왜 Streaming?"** → "과거에서 전송되는" 연출 + 긴 AI 대기 시간 개선
- **"왜 Server Actions?"** → 폼 기반 mutation의 자연스러운 흐름
- **"캐싱 전략 설계"** → 정적 / 요청 / 동적 3계층 분리
- **"얼굴 일관성 유지"** → 모델 선정과 임베딩 재사용 최적화
- **"처음 쓰는 Next.js"** → 단계적 리팩토링 여정
