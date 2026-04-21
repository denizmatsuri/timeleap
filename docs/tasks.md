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

- [ ] **Milestone 1: 프로젝트 환경 세팅**
  - [ ] Next.js 16 + TypeScript + Tailwind + shadcn/ui 초기화
  - [ ] Supabase 프로젝트 생성 및 환경변수 설정
  - [ ] 폴더 구조 설계 (`src/app`, `src/components`, `src/lib`, `src/types` 등)
  - [ ] 기본 라우팅 구조 설정 (App Router)
  - [ ] Zustand + TanStack Query 설정

- [ ] **Milestone 2: 인증 / 온보딩 (A)**
  - [ ] Google 소셜 로그인 (Supabase Auth)
  - [ ] 미들웨어 인증 가드 (로그인 전 접근 차단)
  - [ ] 온보딩 플로우 — 얼굴 사진 1~3장 업로드, 닉네임/성별/연령대 입력
  - [ ] users 테이블 스키마 + RLS 정책
  - [ ] Supabase Storage 버킷 설정 (face-images)

- [ ] **Milestone 3: 타임머신 핵심 파이프라인 (C)**
  - [ ] 시대 / 국가 선택 UI (랜덤 포함)
  - [ ] AI 생성 Server Action — Gemini 이미지 3~5장 + Claude 일기 본문
  - [ ] 프롬프트 파일 관리 (`src/lib/prompts/`)
  - [ ] diaries / diary_images 테이블 스키마 + RLS 정책
  - [ ] Rate Limiting 미들웨어 (AI 비용 방어)
  - [ ] AI 결과 DB 캐싱 (입력 해시 기반)

- [ ] **Milestone 4: 스트리밍 결과 출력 (C5)**
  - [ ] 타임머신 작동 로딩 인터랙션
  - [ ] 생성 결과 스트리밍 출력 — 사진 순차 노출 → 일기 타이핑 연출
  - [ ] `/time-machine/result/[id]` 페이지 구현

- [ ] **Milestone 5: 일기 CRUD (D)**
  - [ ] 내 일기 목록 `/me/diaries`
  - [ ] 일기 상세 `/me/diaries/[id]`
  - [ ] 공개/비공개 토글 + `revalidateTag` 처리
  - [ ] 일기 삭제 (이미지 Storage 포함)

- [ ] **Milestone 6: 내 프로필 / 여행 기록 (E)**
  - [ ] `/me` 프로필 페이지 — 얼굴 사진, 닉네임, 여행 횟수
  - [ ] 프로필 수정 (얼굴 사진 재업로드, 정보 변경)
  - [ ] 내 여행 기록 목록 (시대/국가별)

- [ ] **Milestone 7: 공개 갤러리 (F)**
  - [ ] `/explore` 전체 공개 피드 (ISR, 최신순/인기순)
  - [ ] `/explore/country/[code]`, `/explore/era/[era]` 필터 페이지 (ISR)
  - [ ] `/feed/[id]` 공개 일기 상세 (ISR)
  - [ ] `/u/[username]` 다른 유저 공개 프로필

- [ ] **Milestone 8: 좋아요 + 공유 (G, H)**
  - [ ] likes 테이블 + RLS + `useOptimistic` 좋아요 토글
  - [ ] 공유 링크 + SNS 공유 버튼 (X, 카톡, 링크 복사)
  - [ ] Dynamic OG 이미지 `/api/og/[feedId]`

- [ ] **Milestone 9: 랜딩 페이지 (A1)**
  - [ ] `/` 랜딩 페이지 — 비로그인도 공개 갤러리 샘플 접근 가능
  - [ ] 서비스 소개 + CTA

- [ ] **Milestone 10: 폴리싱 + 배포 (I)**
  - [ ] 반응형 디자인 (모바일 우선)
  - [ ] 다크모드
  - [ ] 세계관 반영 에러 페이지 (`error.tsx`) + 스켈레톤 UI (`loading.tsx`)
  - [ ] Vercel 배포 + 환경변수 설정
  - [ ] Vercel Analytics + PostHog 연동
  - [ ] 개인정보 처리방침 / 이용약관 페이지

---

## Backlog

- [ ] 댓글 기능 (MVP 포함 여부 결정 필요)
- [ ] 조회수 집계
- [ ] 계정 / 데이터 삭제 (얼굴 데이터 완전 삭제)
- [ ] Lighthouse 점수 체크 및 개선
- [ ] README 문서화
