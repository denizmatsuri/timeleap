---
name: supabase
description: Supabase Auth, DB, Storage, RLS 정책, 타입 생성. server/browser/middleware 클라이언트 분리, RLS 템플릿, private faces bucket, 계정 삭제 캐스케이드를 다룰 때 자동 로드. src/lib/supabase/**, src/app/**/actions.ts, supabase/** 에서 활성화.
paths:
  - src/lib/supabase/**
  - src/app/**/actions.ts
  - supabase/**
---

# Supabase (Auth / DB / Storage / RLS)

**언제 쓰나:** Supabase 클라이언트 생성, DB 쿼리, RLS 정책, Storage 업로드/조회, 타입 생성을 만질 때.

**Cross-ref:** Server Action 전체 구조는 [nextjs-app-router](../nextjs-app-router/SKILL.md), 캐시 무효화는 [nextjs-caching-streaming](../nextjs-caching-streaming/SKILL.md).

---

## 1. 클라이언트 3종 분리

Supabase는 실행 환경에 따라 **클라이언트 생성 방식이 다름**. 한 곳에서 돌려쓰지 말 것.

```
src/lib/supabase/
├── server.ts       → Server Component / Server Action / Route Handler
├── browser.ts      → Client Component
└── middleware.ts   → src/middleware.ts 의 session 갱신
```

### `server.ts` (cookies API 사용)

```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/db.generated";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출되면 set 불가 — 무시
          }
        },
      },
    },
  );
}
```

### `browser.ts`

```ts
// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db.generated";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### `middleware.ts` (세션 갱신)

```ts
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/db.generated";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser(); // 세션 갱신 트리거
  return response;
}
```

### `admin.ts` (service_role 전용)

```ts
// src/lib/supabase/admin.ts
// ⚠️ 서버에서만 import. 클라이언트 번들에 절대 들어가면 안 됨.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.generated";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

사용처: `src/lib/ai/cache.ts` (AI 캐시 저장), `src/app/api/og/` (Dynamic OG), 계정 삭제 admin 작업.

### DO / DON'T

- DO: 각 파일에서 `const supabase = await createClient()` 로 인스턴스화.
- DON'T: 전역 싱글톤 export. 요청마다 새로 만든다(쿠키 문맥이 다름).
- DON'T: `SUPABASE_SERVICE_ROLE_KEY`를 server/browser/middleware 파일에 쓰기. **service role은 `admin.ts`에서만.**

---

## 2. RLS 정책 템플릿

**테이블 생성과 RLS 활성화는 한 세트.** 정책 없이 테이블 두지 않는다.

```sql
-- ⚠️ DRAFT — 실행 전 feature-guide.md 스키마와 컬럼명 일치 확인
-- supabase/migrations/0001_core_tables.sql

-- users
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  face_image_url text,            -- private bucket 안의 path (Storage URL)
  face_reference_data jsonb,
  gender text,
  age_range text,
  created_at timestamptz default now()
);
alter table public.users enable row level security;

create policy "users: self read"
  on public.users for select using (auth.uid() = id);
create policy "users: self update"
  on public.users for update using (auth.uid() = id);
create policy "users: self insert"
  on public.users for insert with check (auth.uid() = id);

-- diaries
create table public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  era text not null,
  country_code text not null,
  title text not null,
  body text not null,
  hashtags text[] default '{}',
  is_public boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.diaries enable row level security;

create policy "diaries: owner or public read"
  on public.diaries for select
  using (auth.uid() = user_id or is_public = true);
create policy "diaries: owner write"
  on public.diaries for insert with check (auth.uid() = user_id);
create policy "diaries: owner update"
  on public.diaries for update using (auth.uid() = user_id);
create policy "diaries: owner delete"
  on public.diaries for delete using (auth.uid() = user_id);

-- diary_images
create table public.diary_images (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  storage_path text not null,
  order_index int not null,
  caption text
);
alter table public.diary_images enable row level security;

create policy "diary_images: via diary"
  on public.diary_images for select
  using (
    exists (
      select 1 from public.diaries d
      where d.id = diary_id and (d.user_id = auth.uid() or d.is_public = true)
    )
  );
create policy "diary_images: owner write"
  on public.diary_images for all
  using (
    exists (
      select 1 from public.diaries d
      where d.id = diary_id and d.user_id = auth.uid()
    )
  );

-- likes
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (diary_id, user_id)
);
alter table public.likes enable row level security;

create policy "likes: read all" on public.likes for select using (true);
create policy "likes: self write" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes: self delete" on public.likes for delete using (auth.uid() = user_id);
```

### 규칙

- 모든 사용자 데이터 테이블에 `user_id uuid references public.users(id) on delete cascade`
- `alter table ... enable row level security;`를 **create 직후 줄에** 붙이기
- `select` / `insert` / `update` / `delete` 각각 별도 정책 (덩어리로 묶지 말 것)
- 공개 대상은 `or is_public = true` 패턴

---

## 3. Storage 버킷 전략

| 버킷 | public | 용도 | 접근 방식 |
| --- | --- | --- | --- |
| `faces` | **private** | 유저 얼굴 참조 이미지 | signed URL만 (짧은 TTL) |
| `diary-images` | public | AI 생성 일기 사진 | public URL + next/image remotePatterns |

**얼굴 이미지는 절대 public bucket에 올리지 않는다.** 프라이버시 경계.

### Storage 정책 (faces)

```sql
-- supabase/migrations/0002_storage_policies.sql
insert into storage.buckets (id, name, public) values ('faces', 'faces', false);
insert into storage.buckets (id, name, public) values ('diary-images', 'diary-images', true);

create policy "faces: owner only"
  on storage.objects for all
  using (bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "diary-images: owner write, read all"
  on storage.objects for insert
  with check (bucket_id = 'diary-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "diary-images: read all"
  on storage.objects for select using (bucket_id = 'diary-images');
```

Path convention: `<bucket>/<auth.uid>/<...>` → 정책의 `storage.foldername(name)[1]`이 유저 id와 일치해야 통과.

### Signed URL 조회

```ts
// src/lib/supabase/storage.ts (Server 전용)
import { createClient } from "@/lib/supabase/server";

export async function getFaceSignedUrl(path: string, ttlSeconds = 60) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("faces")
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) throw new Error("FACE_URL_FAILED");
  return data.signedUrl;
}
```

AI 파이프라인이 이걸 받아서 Gemini에 전달 (→ [ai-pipeline](../ai-pipeline/SKILL.md)).

---

## 4. 타입 생성 & 사용

```bash
# package.json script
"db:types": "supabase gen types typescript --linked > src/types/db.generated.ts"
```

`src/types/db.generated.ts`는 **자동 생성**. 수동 편집 금지.

### Entity 타입 추출

```ts
// src/types/domain.ts
import type { Database } from "@/types/db.generated";

export type Diary = Database["public"]["Tables"]["diaries"]["Row"];
export type DiaryInsert = Database["public"]["Tables"]["diaries"]["Insert"];
export type DiaryUpdate = Database["public"]["Tables"]["diaries"]["Update"];

export type DiaryImage = Database["public"]["Tables"]["diary_images"]["Row"];

export type PublicDiary = Diary & { is_public: true }; // 필요 시 좁히기
```

`Row` 바꿔치기 금지. 공개 필드만 내려보내려면 `Pick<Diary, ...>` 또는 select 컬럼 명시.

---

## 5. 쿼리 패턴

```ts
// Server Action 안에서
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return { ok: false, error: "UNAUTHORIZED" };

const { data, error } = await supabase
  .from("diaries")
  .select("id, title, body, is_public, created_at, diary_images(storage_path, order_index)")
  .eq("id", diaryId)
  .single();

if (error) return { ok: false, error: error.message };
```

### 규칙

- `select("*")` 금지. 필요한 컬럼만.
- join은 nested select (`diary_images(storage_path, order_index)`)로.
- `.single()` / `.maybeSingle()` 구분 (PK 조회는 single, 없을 수도 있으면 maybeSingle).
- error를 무시하고 data 사용 금지 — `if (error)` 먼저.

---

## 6. 계정 삭제 (캐스케이드 체크리스트)

feature-guide §A5 — 얼굴 데이터 완전 삭제 요구. `on delete cascade`만 믿지 말고 Storage까지 명시적으로 정리.

```ts
// src/app/me/settings/actions.ts
"use server";
import { createClient } from "@/lib/supabase/server";

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHORIZED" };

  // 1. Storage: faces/<uid>/*
  const { data: faceObjects } = await supabase.storage.from("faces").list(user.id);
  if (faceObjects?.length) {
    await supabase.storage
      .from("faces")
      .remove(faceObjects.map((o) => `${user.id}/${o.name}`));
  }

  // 2. Storage: diary-images/<uid>/*
  const { data: imgObjects } = await supabase.storage.from("diary-images").list(user.id);
  if (imgObjects?.length) {
    await supabase.storage
      .from("diary-images")
      .remove(imgObjects.map((o) => `${user.id}/${o.name}`));
  }

  // 3. DB: users 삭제 → diaries/likes/diary_images는 cascade로 정리됨
  await supabase.from("users").delete().eq("id", user.id);

  // 4. Auth 유저 자체 삭제는 service_role 필요 → admin 경로에서 수행
  // 이 함수는 로그아웃까지만. 실제 auth.users row 삭제는 별도 admin 작업.

  await supabase.auth.signOut();
  return { ok: true, data: null };
}
```

`auth.users` row 삭제는 **service_role 클라이언트 필요** — 관리자 스크립트나 별도의 보호된 admin 엔드포인트에서만.

---

## 7. 마이그레이션 규칙

- 파일명: `supabase/migrations/NNNN_<동사>_<대상>.sql`
- 한 파일 = 한 논리 변경
- RLS enable + policy를 같은 파일에
- 롤백 SQL은 주석으로 함께 (다운 마이그레이션 스크립트 형태)

---

## 체크리스트

- [ ] 새 테이블에 RLS enable + select/insert/update/delete 정책 4개 작성
- [ ] 사용자 데이터 테이블에 `on delete cascade`로 users 참조
- [ ] Storage 경로가 `<uid>/...` 형태 (정책과 일치)
- [ ] 얼굴 이미지는 private bucket + signed URL
- [ ] `select("*")` 없는가
- [ ] 타입은 `supabase gen types` 재생성 후 import
