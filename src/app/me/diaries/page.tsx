import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import {
  createDiaryHeroImageUrlOrNull,
  getUserDiaries,
  type DiaryRecord,
} from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";
import { type EraTone } from "@/app/time-machine/_data/time-machine-destinations";

export const metadata: Metadata = {
  title: "My Diaries — Timeleap",
  description: "내 Timeleap 여행기 목록",
};

const HERO_PHOTO_BY_TONE: Record<EraTone, string> = {
  azure: "ph-fifties",
  champagne: "ph-gilded",
  chrome: "ph-eighties",
  cobalt: "ph-ticket",
  disco: "ph-disco",
  electric: "ph-eighties",
  ember: "ph-wildwest",
  fiesta: "ph-fifties",
  fog: "ph-noir",
  indigo: "ph-ticket",
  mod: "ph-sixties",
  noir: "ph-noir",
  pastel: "ph-fifties",
  punk: "ph-roaring",
  sepia: "ph-gilded",
};

type DiaryListItem = {
  city: string;
  countryFlag: string;
  countryName: string;
  createdAtLabel: string;
  eraTitle: string;
  eraYear: string;
  excerpt: string;
  heroImageUrl: string | null;
  id: string;
  isPublic: boolean;
  placeholderClassName: string;
  title: string;
};

function getPassengerName({
  displayName,
  email,
}: {
  displayName?: string | null;
  email?: string | null;
}) {
  const trimmedName = displayName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const [localPart] = email?.split("@") ?? [];

  return localPart || "PASSENGER";
}

function formatDiaryDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt.slice(0, 10).replaceAll("-", ".");
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\s/g, "");
}

function createExcerpt(body: string | null) {
  const normalizedBody = body?.replace(/\s+/g, " ").trim();

  if (!normalizedBody) {
    return "아직 본문이 정리되지 않은 여행기입니다.";
  }

  if (normalizedBody.length <= 118) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, 118)}…`;
}

async function toDiaryListItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  diary: DiaryRecord,
): Promise<DiaryListItem> {
  const { country, era } = resolveDestinationByDiary({
    countryCode: diary.country_code,
    eraId: diary.era_id,
  });
  const heroImageUrl = await createDiaryHeroImageUrlOrNull(
    supabase,
    diary.hero_image_path,
  );

  return {
    city: era.city,
    countryFlag: country.flag,
    countryName: country.name,
    createdAtLabel: formatDiaryDate(diary.created_at),
    eraTitle: era.title,
    eraYear: era.year,
    excerpt: createExcerpt(diary.body),
    heroImageUrl,
    id: diary.id,
    isPublic: diary.is_public,
    placeholderClassName: HERO_PHOTO_BY_TONE[era.tone],
    title: diary.title?.trim() || era.sceneCards[0].title,
  };
}

export default async function MyDiariesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(createLoginRedirectPath("/me/diaries"));
  }

  const [{ data: profile, error: profileError }, diaries] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    getUserDiaries(supabase, user.id),
  ]);

  if (profileError) {
    throw new Error(`Diary 프로필을 읽지 못했습니다. ${profileError.message}`);
  }

  const diaryItems = await Promise.all(
    diaries.map((diary) => toDiaryListItem(supabase, diary)),
  );
  const publicCount = diaryItems.filter((diary) => diary.isPublic).length;
  const privateCount = diaryItems.length - publicCount;
  const passengerName = getPassengerName({
    displayName: profile?.display_name,
    email: user.email,
  });

  return (
    <div className="bg-paper text-ink relative min-h-dvh overflow-x-hidden">
      <div className="paper-grain pointer-events-none absolute inset-0 z-0" />

      <nav className="border-ink/12 bg-paper/80 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-300 items-center gap-6 px-6 py-3.5">
          <Link
            href="/"
            className="font-display flex items-center gap-2.5 text-[22px] font-medium tracking-[-0.02em]"
          >
            <div className="brand-mark h-7.5 w-7.5" />
            <div>
              <div>TIMELEAP</div>
              <div className="font-mono text-[9px] font-normal tracking-[.12em] uppercase opacity-55">
                Archive of Impossible Days
              </div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/time-machine"
              className="rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100"
            >
              다시 떠나기
            </Link>
            <span className="border-ink/12 bg-paper-2/70 hidden rounded-full border px-3 py-2 font-mono text-[10px] tracking-[.08em] opacity-55 sm:inline-flex">
              {passengerName}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-300 px-6 py-12 lg:py-16">
        <section className="border-ink/12 mb-9 grid gap-8 border-b pb-9 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-4">
              <span className="stamp">PRIVATE ARCHIVE</span>
            </div>
            <h1 className="font-display max-w-[760px] text-[clamp(40px,6vw,78px)] leading-[0.98] font-light tracking-[-0.035em]">
              내 시간 여행 기록
            </h1>
            <p className="mt-5 max-w-[620px] text-[16px] leading-[1.7] opacity-75">
              저장된 여행기를 다시 열어 보고, 공개 여부를 관리할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "TOTAL", value: diaryItems.length },
              { label: "PUBLIC", value: publicCount },
              { label: "PRIVATE", value: privateCount },
            ].map((item) => (
              <div
                key={item.label}
                className="border-ink/12 bg-ink/4 rounded-[10px] border px-4 py-4"
              >
                <div className="font-display text-[28px] leading-none tracking-[-0.03em]">
                  {item.value}
                </div>
                <div className="mt-2 font-mono text-[10px] tracking-[.12em] opacity-55">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {diaryItems.length === 0 ? (
          <section className="border-ink/12 bg-ink/4 mx-auto max-w-[720px] rounded-[14px] border px-7 py-12 text-center">
            <div className="font-mono text-[11px] tracking-[.16em] opacity-55">
              NO DIARY YET
            </div>
            <h2 className="font-display mt-3 text-[34px] leading-tight tracking-[-0.03em]">
              아직 도착한 기록이 없습니다
            </h2>
            <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-[1.7] opacity-70">
              타임머신을 한 번 가동하면 이곳에 여행기가 차곡차곡 저장됩니다.
            </p>
            <Link
              href="/time-machine"
              className="bg-ink text-paper font-display mt-7 inline-flex rounded-full px-7 py-4 text-[15px] tracking-[-0.01em] transition-transform hover:-translate-y-px"
            >
              첫 여행 떠나기
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {diaryItems.map((diary) => (
              <Link
                key={diary.id}
                href={`/me/diaries/${diary.id}`}
                className="group border-ink/12 bg-ink/4 flex min-h-[460px] flex-col overflow-hidden rounded-[10px] border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-18px_rgba(0,0,0,.4)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {diary.heroImageUrl ? (
                    <Image
                      src={diary.heroImageUrl}
                      alt={`${diary.countryName} ${diary.eraTitle} 대표 사진`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      unoptimized
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03] ${diary.placeholderClassName}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/72 via-black/10 to-transparent" />
                  <div className="absolute right-4 bottom-4 left-4 text-[#fdf6e3]">
                    <div className="font-mono text-[10px] tracking-[.14em] opacity-75">
                      {diary.createdAtLabel}
                    </div>
                    <div className="font-display mt-1 flex items-center gap-2 text-[17px] tracking-[-0.01em]">
                      <span>{diary.countryFlag}</span>
                      <span>
                        {diary.countryName} · {diary.city}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="bg-ember/15 text-ember-2 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[.08em]">
                      {diary.eraYear}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[.08em] ${
                        diary.isPublic
                          ? "bg-sage/14 text-sage"
                          : "bg-ink/8 text-ink/60"
                      }`}
                    >
                      {diary.isPublic ? "PUBLIC" : "PRIVATE"}
                    </span>
                  </div>
                  <h2 className="font-display text-[24px] leading-[1.08] tracking-[-0.02em]">
                    {diary.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-[14px] leading-[1.65] opacity-70">
                    {diary.excerpt}
                  </p>
                  <div className="border-ink/10 mt-auto flex items-center justify-between border-t pt-4 font-mono text-[11px] tracking-[.08em] opacity-60">
                    <span>{diary.eraTitle}</span>
                    <span>관리 →</span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
