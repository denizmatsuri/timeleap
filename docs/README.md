# Timeleap Docs

문서의 책임은 아래처럼 나눈다.

| 문서 | 역할 |
| --- | --- |
| `feature-guide.md` | 기능, 스코프, 라우팅 로드맵의 source of truth |
| `ARCHITECTURE.md` | Next.js App Router 구조, 레이어 규칙, 리팩토링 방향 |
| `TASKS.md` | 현재 구현 상태와 다음 작업 |
| `ONBOARDING_ARCHITECTURE.md` | 온보딩 기능 상세 설명 |
| `features/generation-jobs-roadmap.md` | 생성 job, idempotency, quota 설계 |
| `features/zen-ai-guid.md` | AI 생성 MVP 흐름 설명 |

새 기능 문서는 먼저 `feature-guide.md`에 요약을 반영한 뒤, 세부 설계가 길어질 때
`docs/features/` 아래에 별도 문서로 분리한다.
