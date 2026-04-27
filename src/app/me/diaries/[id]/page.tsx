import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/actions/auth";
import { deleteDiary, updateDiaryVisibility } from "@/actions/diary";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import {
  createDiaryHeroImageUrlOrNull,
  getOwnedDiaryById,
} from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";
import { type EraTone } from "@/app/time-machine/_data/time-machine-destinations";

export const metadata: Metadata = {
  title: "Diary Detail — Timeleap",
  description: "내 Timeleap 여행기 상세 및 공개 상태 관리",
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

type MyDiaryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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

  return localPart || "나";
}

function getPassengerInitial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function formatEntryDate(createdAt: string) {
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

function buildFallbackBody({
  countryName,
  eraTitle,
  eraYear,
  sceneNote,
  sceneTitle,
}: {
  countryName: string;
  eraTitle: string;
  eraYear: string;
  sceneNote: string;
  sceneTitle: string;
}) {
  return `${eraYear}년 ${sceneTitle}의 공기 속에서 ${sceneNote}가 먼저 다가왔다. ${countryName}의 ${eraTitle}은 아주 짧은 순간이었지만 오래 남을 하루처럼 기록되었다.`;
}

export default async function MyDiaryDetailPage({
  params,
}: MyDiaryDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(createLoginRedirectPath(`/me/diaries/${id}`));
  }

  const [diary, { data: profile, error: profileError }] = await Promise.all([
    getOwnedDiaryById({
      id,
      supabase,
      userId: user.id,
    }),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!diary) {
    notFound();
  }

  if (profileError) {
    throw new Error(`Diary 프로필을 읽지 못했습니다. ${profileError.message}`);
  }

  const { country, era } = resolveDestinationByDiary({
    countryCode: diary.country_code,
    eraId: diary.era_id,
  });
  const passengerName = getPassengerName({
    displayName: profile?.display_name,
    email: user.email,
  });
  const passengerInitial = getPassengerInitial(passengerName);
  const entryDate = formatEntryDate(diary.created_at);
  const title = diary.title?.trim() || era.sceneCards[0].title;
  const diaryEntry =
    diary.body?.trim() ||
    buildFallbackBody({
      countryName: country.name,
      eraTitle: era.title,
      eraYear: era.year,
      sceneNote: era.sceneCards[0].note,
      sceneTitle: era.sceneCards[0].title,
    });
  const heroImageUrl = await createDiaryHeroImageUrlOrNull(
    supabase,
    diary.hero_image_path,
  );
  const heroPhotoClass = HERO_PHOTO_BY_TONE[era.tone];
  const visibilityTarget = diary.is_public ? "false" : "true";
  const visibilityActionLabel = diary.is_public
    ? "비공개로 전환"
    : "공개로 전환";
  const tags = [
    `#${country.name}`,
    `#${era.year}`,
    `#${era.title.replaceAll(" ", "")}`,
    `#${era.mood.replaceAll(" ", "")}`,
  ];

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
              href="/me/diaries"
              className="rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100"
            >
              내 일기장
            </Link>
            <Link
              href="/time-machine"
              className="hidden rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100 sm:inline-flex"
            >
              다시 떠나기
            </Link>
            <span className="border-ink/12 bg-paper-2/70 hidden rounded-full border px-3 py-2 font-mono text-[10px] tracking-[.08em] opacity-55 md:inline-flex">
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

      <main className="relative z-10 min-h-[calc(100dvh-57px)] pb-20">
        <section className="border-ink/10 mx-auto max-w-[860px] border-b px-6 pt-12 pb-8 text-center lg:pt-14">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
            <span className="stamp">ARRIVED · {era.year}</span>
            <span className="font-mono text-[12px] tracking-[0.15em] opacity-65">
              {entryDate}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] ${
                diary.is_public
                  ? "bg-sage/14 text-sage"
                  : "bg-ink/8 text-ink/60"
              }`}
            >
              {diary.is_public ? "PUBLIC" : "PRIVATE"}
            </span>
          </div>

          <div className="mb-4 inline-flex flex-wrap items-center justify-center gap-2 font-mono text-[12px] tracking-[0.1em] opacity-75">
            <span className="text-[16px]">{country.flag}</span>
            <span>
              {country.name} · {era.city}
            </span>
            <span className="opacity-45">/</span>
            <span>
              {era.title} {era.mood}
            </span>
          </div>

          <h1 className="font-display mx-auto max-w-[720px] text-[clamp(34px,5vw,58px)] leading-[1.04] tracking-[-0.03em] italic">
            {title}
          </h1>

          <div className="mt-5 inline-flex items-center gap-3 font-mono text-[12px] tracking-[0.08em] opacity-70">
            <div className="from-ember to-coral text-paper font-display grid h-9 w-9 place-items-center rounded-full bg-linear-to-br text-sm">
              {passengerInitial}
            </div>
            <span>{passengerName}의 여행기</span>
          </div>
        </section>

        <section className="mx-auto max-w-[860px] px-6 pt-10">
          <div className="mb-10 flex justify-center">
            <figure className="bg-paper relative w-full max-w-[520px] rotate-[-1.2deg] p-3 pb-12 shadow-[0_1px_0_rgba(0,0,0,.05),0_18px_40px_-18px_rgba(0,0,0,.28)]">
              <div className="bg-paper-3 relative aspect-[4/5] overflow-hidden">
                {heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={`${country.name} ${era.title} 대표 사진`}
                    fill
                    sizes="(min-width: 1024px) 520px, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`${heroPhotoClass} absolute inset-0`} />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.24))]" />
                <div className="absolute bottom-3 left-3 rounded-sm bg-black/30 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white/75 uppercase">
                  Generated Hero Frame
                </div>
              </div>
              <figcaption className="font-handwriting text-ink-2 absolute inset-x-3 bottom-3 text-center text-[16px] italic">
                {era.sceneCards[0].note}
              </figcaption>
            </figure>
          </div>

          <article className="text-ink-2 mx-auto max-w-[720px] font-serif text-[20px] leading-[1.9]">
            <p className="text-pretty">{diaryEntry}</p>
          </article>

          <aside className="border-ink/12 mx-auto mt-10 max-w-[720px] border-t pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[11px] tracking-[0.1em]">
              <span
                className={`tracking-[0.12em] ${
                  diary.is_public ? "text-sage" : "text-ink/50"
                }`}
              >
                {diary.is_public ? "PUBLIC" : "PRIVATE"}
              </span>
              <form action={updateDiaryVisibility}>
                <input type="hidden" name="diaryId" value={diary.id} />
                <input type="hidden" name="isPublic" value={visibilityTarget} />
                <button
                  type="submit"
                  className="text-ink/65 hover:text-ink transition-colors"
                >
                  {visibilityActionLabel}
                </button>
              </form>
              <Link
                href={`/diary/${diary.id}`}
                className="text-ink/65 hover:text-ink transition-colors"
              >
                공유용 보기
              </Link>
              <Link
                href="/time-machine"
                className="text-ink/65 hover:text-ink transition-colors"
              >
                다시 떠나기
              </Link>
              <form action={deleteDiary} className="sm:ml-auto">
                <input type="hidden" name="diaryId" value={diary.id} />
                <button
                  type="submit"
                  className="text-coral/80 hover:text-coral transition-colors"
                >
                  삭제
                </button>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-ember-2 font-mono text-[10px] tracking-[0.1em] uppercase opacity-80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
