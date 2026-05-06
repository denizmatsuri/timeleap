---
title: Generation Jobs 개선 설계
status: revised
created: 2026-04-27
tags:
  - timeleap
  - ai-generation
  - idempotency
  - quota
---

# Generation Jobs 개선 설계

관련 문서: `docs/feature-guide.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`,
`docs/features/zen-ai-guid.md`

## 현재 결정

MVP의 생성 중복 방지 설계를 `generation_jobs` 기준으로 수정했다.

현재 코드에는 다음이 있다.

- `src/lib/time-machine/generation-job.ts`
- `src/actions/time-machine.ts`의 생성 job 생성/조회/성공/실패 처리
- `src/types/database.types.ts`의 `generation_jobs` 타입

다만 repo에서 보이는 migration 파일은 아직 `diaries` 중심이다. 운영/협업 전에는
Supabase remote schema와 `supabase/migrations`가 같은 상태인지 확인해야 한다.

핵심 기준은 여전히 같다. 같은 출발 요청은 같은 `generationRequestId`로 수렴시켜
중복 AI 호출과 중복 Diary 저장을 막는다.

```txt
사용자가 "타임 머신 떠나기" 클릭
-> requestId 생성
-> /time-machine/result?country=...&era=...&requestId=...
-> Server Action에 requestId 전달
-> 같은 userId + requestId diary가 있으면 기존 diaryId 반환
-> 없으면 AI 생성 후 diary 저장
```

MVP에서 필요한 제약:

```txt
unique(user_id, generation_request_id)
```

클라이언트에는 `useRef` 실행 가드를 둬서 React Strict Mode, Fast Refresh, 재마운트로 인한 불필요한 중복 호출을 줄인다.

## 왜 inputHash를 중복 방지 기준으로 쓰지 않는가

이 서비스는 사용자가 같은 사진, 같은 시대, 같은 국가로도 결과가 마음에 들지 않으면 다시 생성할 수 있어야 한다.

`inputHash`를 unique 기준으로 쓰면 같은 입력은 항상 기존 결과를 반환하게 된다. 이는 "다시 떠나기" 또는 "다시 생성하기" UX와 충돌한다.

따라서 중복 방지 기준은 입력값이 아니라 "한 번의 출발 요청"이어야 한다.

```txt
같은 requestId가 여러 번 처리됨 -> 중복이므로 막는다.
같은 입력으로 새 requestId가 생성됨 -> 사용자의 의도적 재생성이므로 허용한다.
```

## generation_jobs가 필요한 이유

`diaries.generation_request_id`만으로도 중복 저장은 줄일 수 있지만, 생성 요청 자체를
추적하지 못한다.

한계:

- 생성 실패 기록이 남지 않는다.
- 생성 중인 요청을 복구하기 어렵다.
- 같은 요청이 거의 동시에 들어오면 중복 AI 호출이 발생할 수 있다.
- 주간 생성 횟수 제한을 정확하게 관리하기 어렵다.
- "생성 중", "실패", "재시도" 상태를 제품 UX로 표현하기 어렵다.

주간 횟수 제한, 실패 재시도, 생성 중 복구를 구현하려면 `generation_jobs`가 필요하다.

## 목표 설계

`diaries`는 완성된 결과만 저장한다.

`generation_jobs`는 생성 요청의 생명주기를 저장한다.

```txt
generation_jobs
- id
- user_id
- country_code
- era_id
- status
- diary_id
- attempt_count
- error_message
- lease_expires_at
- started_at
- completed_at
- failed_at
- created_at
- updated_at
```

`id`는 클라이언트가 만든 `requestId`를 그대로 사용하거나, `request_id` 컬럼을 별도로 두고 `unique(user_id, request_id)`를 건다.

권장 상태:

```txt
pending
running
succeeded
failed
cancelled
```

상태 의미:

```txt
pending
요청은 만들어졌지만 아직 AI 생성 시작 전.

running
서버가 AI 생성, 이미지 업로드, diary 저장을 처리 중.

succeeded
diary 생성이 끝났고 diary_id가 연결됨.

failed
생성이 실패했고 error_message에 원인이 저장됨.

cancelled
사용자가 취소했거나 더 이상 처리하지 않을 요청.
```

## 핵심 규칙

같은 `user_id + requestId` 요청은 하나의 job으로 수렴해야 한다.

```txt
job.status = running
-> 새 AI 호출 금지
-> 기존 job 상태를 반환하거나 로딩 유지

job.status = succeeded
-> 새 AI 호출 금지
-> 기존 diary_id 반환

job.status = failed
-> 자동 중복 요청이면 재실행 금지
-> 사용자가 다시 생성 버튼을 누르면 새 requestId로 새 job 생성
```

사용자가 결과가 마음에 들지 않아 다시 돌리는 것은 기존 job 재사용이 아니라 새 job 생성이다.

```txt
기존 결과 재생성 아님
새 requestId
새 generation_job
새 diary
주간 횟수 제한 검사 대상
```

## 동시성 처리

`generation_jobs`를 도입할 때는 조회 후 생성 패턴만 쓰면 안 된다.

피해야 할 흐름:

```txt
요청 A: job 조회 -> 없음
요청 B: job 조회 -> 없음
요청 A: AI 생성 시작
요청 B: AI 생성 시작
```

필요한 처리:

- `insert ... on conflict`로 같은 requestId job을 하나만 만든다.
- `pending` 또는 만료된 `running` job만 원자적으로 `running`으로 claim한다.
- 이미 `running` 또는 `succeeded`인 job은 AI 호출을 시작하지 않는다.

가능하면 Postgres 함수로 claim 로직을 묶는다.

예시 의사코드:

```sql
update generation_jobs
set
  status = 'running',
  started_at = coalesce(started_at, now()),
  lease_expires_at = now() + interval '10 minutes',
  attempt_count = attempt_count + 1,
  updated_at = now()
where id = target_request_id
  and user_id = auth.uid()
  and (
    status = 'pending'
    or (
      status = 'running'
      and lease_expires_at < now()
    )
  )
returning *;
```

## 주간 횟수 제한 정책

주간 횟수 제한은 `diaries`보다 `generation_jobs` 기준으로 관리하는 것이 자연스럽다.

결정해야 할 정책:

```txt
생성 시작 시 차감
- AI 비용 방어에 유리
- 실패해도 횟수가 줄어 사용자 불만 가능

생성 성공 시 차감
- 사용자에게 공정함
- 실패 반복으로 AI 비용이 노출될 수 있음

시작 시 예약 차감 후 실패 시 환불
- 가장 정확함
- quota ledger 또는 transaction 설계가 필요
```

권장 정책:

```txt
MVP 이후 첫 quota 구현:
생성 시작 시 차감.
단, 서버/모델 오류처럼 사용자 책임이 아닌 실패는 환불 또는 failed_non_billable 상태로 처리.
```

## stuck job 복구

서버가 `running`으로 바꾼 뒤 AI 호출 중 죽으면 job이 계속 `running`으로 남을 수 있다.

따라서 `lease_expires_at`을 둔다.

```txt
running + lease_expires_at이 지남
-> 만료된 job으로 간주
-> 새 요청이 오면 failed 처리하거나 다시 claim 허용
```

초기 정책:

```txt
running이 10분 이상 지속되면 만료.
만료된 job은 사용자에게 실패로 보여주고, 재시도는 새 requestId로만 허용.
```

## diaries와 job 불일치 복구

이미지 업로드와 diary insert는 외부 작업이 섞여 있어 하나의 DB transaction으로 완전히 묶기 어렵다.

가능한 불일치:

```txt
이미지 업로드 성공
diary insert 성공
job succeeded 업데이트 전에 서버 종료
```

복구 기준:

- job이 `running`인데 연결 가능한 diary가 있으면 `succeeded`로 보정한다.
- diary 생성 전 실패했다면 `failed`로 보정한다.
- 업로드된 이미지가 있지만 diary가 없으면 cleanup 대상이다.

이 복구는 처음부터 자동화하지 않아도 되지만, 운영 전에는 관리 쿼리 또는 cleanup 스크립트를 둔다.

## RLS 원칙

새 테이블은 반드시 RLS를 켠다.

필수 정책:

```txt
select
auth.uid() = user_id

insert
auth.uid() = user_id

update
auth.uid() = user_id
```

클라이언트에서 직접 status를 조작하지 않게 하려면, status 변경은 Server Action 또는 RPC 함수 경유로 제한한다.

## 전환 단계

1. 현재 MVP 구조를 안정화한다.
   - `diaries.generation_request_id`
   - `generation_jobs`
   - 클라이언트 `useRef` 가드

2. `generation_jobs` 테이블 source를 migration에 동기화한다.
   - RLS 포함
   - status 컬럼 포함
   - diary_id nullable FK

3. 필요한 경우 기존 diary 데이터를 succeeded job으로 백필한다.

```txt
generation_jobs.id = diaries.generation_request_id
generation_jobs.user_id = diaries.user_id
generation_jobs.country_code = diaries.country_code
generation_jobs.era_id = diaries.era_id
generation_jobs.status = succeeded
generation_jobs.diary_id = diaries.id
generation_jobs.created_at = diaries.created_at
```

4. Server Action 흐름을 안정화한다.
   - diary 선조회 대신 job 생성/claim 먼저 수행
   - `running` 또는 `succeeded` job이면 새 AI 호출 금지
   - 성공 시 diary insert 후 job에 diary_id 연결

5. 주간 quota를 job 생성 또는 running claim 단계에 연결한다.

6. 실패/재시도 UX를 정리한다.
   - 자동 중복 요청은 재시도 아님
   - 사용자가 다시 생성하면 새 requestId

## 완료 조건

- 같은 requestId로 여러 요청이 들어와도 AI 호출은 최대 1회만 실행된다.
- 같은 requestId가 `succeeded`면 항상 같은 diaryId를 반환한다.
- 사용자가 다시 생성하면 새 requestId와 새 job이 만들어진다.
- 주간 횟수 제한은 새 job 기준으로 검사된다.
- 실패한 생성 요청이 기록되고 사용자에게 복구 가능한 상태로 표시된다.
- `diaries`는 완성된 결과만 저장한다.
