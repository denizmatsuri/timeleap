# Project Plan & Task Tracker

## 목표

타임머신 일기 — 내 얼굴 사진으로 과거 특정 시대/나라의 하루를 사진과 일기로 받아보는 서비스

---

## 개발 타임라인

| 주차   | 주요 목표                     |
| ------ | ----------------------------- |
| Week 1 | 프로젝트 기반, 인증, 온보딩   |
| Week 2 | AI 생성 파이프라인 + 스트리밍 |
| Week 3 | 일기 CRUD + 공개 갤러리       |
| Week 4 | 폴리싱, 배포                  |

---

## 진행 현황

- [x] **Milestone 1: 프로젝트 환경 세팅**
  - [x] Next.js 16 + TypeScript + Tailwind 초기화
  - [x] Supabase 프로젝트 생성 및 환경변수 설정 2026-04-21 10:41:20
  - [x] 폴더 구조 설계 (`src/app`, `src/components`, `src/lib`, `src/types` 등)
  - [x] 기본 라우팅 구조 설정 (App Router)
  - [x] Zustand + TanStack Query 설정

- [x] **Milestone 2: 인증 / 온보딩 (A)**
  - [x] Google 소셜 로그인 (Supabase Auth) + OAuth callback 구현 2026-04-21
  - [x] `proxy.ts` 세션 refresh + 서버 `getUser()` 기반 접근 제어 2026-04-21
  - [x] 온보딩 플로우 — 닉네임/성별/연령대 입력 2026-04-21
  - [x] `profiles` 테이블 스키마 + RLS 정책 2026-04-21
  - [x] Supabase Storage 버킷 설정 (face-images)
  - [x] 얼굴 사진 1~3장 업로드 플로우 연결
  - [x] 스텝별 저장 및 여권완료
  - [x] ai에게 기능구현 정리 요청하기 2026-04-22 15:12:33

- [x] **Milestone 3: 타임머신 핵심 파이프라인 (C)**
  - [x] 시대 / 국가 선택 UI (랜덤 포함)
  - [x] AI 생성 Server Action — MVP 기준 대표 사진 1장 + 짧은 일기 본문 생성
  - [x] 프롬프트 파일 관리 (`src/lib/prompts/`)
  - [x] `diaries` 테이블 + `diary-images` Storage + RLS 정책
  - [x] Rate limiting 전단 처리 (`proxy.ts` 또는 별도 edge entry) + action guard

- [x] **Milestone 4: 스트리밍 결과 출력 (C5)**
  - [x] 타임머신 작동 로딩 인터랙션
  - [x] `/time-machine/result` 페이지 구현 — 생성 요청 대기 + 최소 3초 로딩 연출
  - [x] `/diaries/[id]` 페이지 구현 — DB에서 저장된 대표 사진 + 짧은 일기 렌더링

- [x] **Milestone 5: 일기 CRUD (D)**
  - [x] 내 일기 목록 `/me`
  - [x] 일기 상세 `/diaries/[id]`
  - [x] 공개/비공개 토글 + `revalidateTag` 처리
  - [x] 일기 삭제 (이미지 Storage 포함)

- [ ] **Milestone 6: 내 프로필 / 여행 기록 (E)**
  - [ ] `/me` 프로필 페이지 — 얼굴 사진, 닉네임, 여행 횟수
  - [ ] 프로필 수정 (얼굴 사진 재업로드, 정보 변경)
  - [ ] 내 여행 기록 목록 (시대/국가별)

- [ ] **Milestone 7: 공개 Diary 목록 (F)**
  - [ ] `/diaries` 전체 공개 Diary 목록
  - [ ] `/diaries/country/[code]`, `/diaries/era/[era]` 필터 페이지
  - [ ] `/diaries/[id]` 공개 Diary 상세
  - [ ] `/u/[username]` 다른 유저 공개 프로필

- [ ] **Milestone 8: 좋아요 + 공유 (G, H)**
  - [ ] likes 테이블 + RLS + `useOptimistic` 좋아요 토글
  - [ ] 공유 링크 + SNS 공유 버튼 (X, 카톡, 링크 복사)
  - [ ] Dynamic OG 이미지 `/api/og/[feedId]`

- [ ] **Milestone 9: 랜딩 페이지 (A1)**
  - [ ] `/` 랜딩 페이지 — 비로그인도 공개 갤러리 샘플 접근 가능
  - [ ] 서비스 소개 + CTA

- [ ] **Milestone 10: 폴리싱 + 최적화**
  - [ ] 캐싱 최적화
  - [ ] 반응형 디자인 (모바일 우선)
  - [ ] 디자인 완성도
  - [ ] 리팩토링
  - [ ] 생성 실패 후 `다시 생성하기` 클릭 시 새 `requestId`로 result URL을 교체
  - [ ] 세계관 반영 에러 페이지 (`error.tsx`) + 스켈레톤 UI (`loading.tsx`)

- [ ] **Milestone 11: 폴리싱 + 배포 (I)**
  - [ ] Vercel 배포 + 환경변수 설정
  - [ ] Vercel Analytics + PostHog 연동
  - [ ] 개인정보 처리방침 / 이용약관 페이지

---

## 구조 정리 메모

- [ ] `docs/feature-guide.md`를 기능/스코프/라우팅 기준 문서로 사용
- [ ] 공개 목록 route를 `/diaries` 기준으로 정리
- [ ] `src/app/(site)`와 `src/app/(protected)` route group 도입 검토
- [ ] `SiteHeader`와 page shell 반복 제거
- [ ] `src/app/time-machine/_data/time-machine-destinations.ts`를 `src/features` 또는 `src/lib`로 이동
- [ ] `/time-machine/result`를 `/time-machine/result/[id]`로 변경 검토
- [ ] `generation_jobs` 관련 코드/type/migration 동기화 상태 확인

---

## Backlog

- [ ] Generation Jobs migration 동기화 확인 — 생성 요청 상태 추적, 주간 횟수 제한, 중복 AI 호출 방지 (`docs/features/generation-jobs-roadmap.md`)
- [ ] 댓글 기능 (MVP 포함 여부 결정 필요)
- [ ] 조회수 집계
- [ ] 계정 / 데이터 삭제 (얼굴 데이터 완전 삭제)
- [ ] Lighthouse 점수 체크 및 개선
- [ ] README 문서화
