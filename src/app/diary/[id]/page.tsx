import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signOut } from "@/actions/auth";
import ResultFooter from "@/app/diary/_components/result-footer";
import { createDiaryHeroImageUrl, getDiaryById } from "@/lib/diaries/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";
import { type EraTone } from "@/app/time-machine/_data/time-machine-destinations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Diary — Timeleap",
  description: "AI가 생성하고 저장한 Timeleap 여행기 상세 페이지",
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

type DiaryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function getPassengerName({
  displayName,
  email,
  isOwner,
}: {
  displayName?: string | null;
  email?: string | null;
  isOwner: boolean;
}) {
  if (!isOwner) {
    return "Timeleap Traveler";
  }

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

export default async function DiaryDetailPage({
  params,
}: DiaryDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const diary = await getDiaryById(supabase, id);

  if (!diary) {
    notFound();
  }

  const isOwner = diary.user_id === user?.id;

  if (!diary.is_public && !isOwner) {
    notFound();
  }

  const { country, era } = resolveDestinationByDiary({
    countryCode: diary.country_code,
    eraId: diary.era_id,
  });
  const { data: ownerProfile, error: ownerProfileError } = isOwner
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", diary.user_id)
        .maybeSingle()
    : { data: null, error: null };

  if (ownerProfileError) {
    throw new Error(
      `Diary 프로필을 읽지 못했습니다. ${ownerProfileError.message}`,
    );
  }

  const passengerName = getPassengerName({
    displayName: ownerProfile?.display_name,
    email: user?.email,
    isOwner,
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
  const heroPhotoClass = HERO_PHOTO_BY_TONE[era.tone];
  const heroImageUrl = diary.hero_image_path
    ? await createDiaryHeroImageUrl(supabase, diary.hero_image_path)
    : null;
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
              href="/time-machine"
              className="rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100"
            >
              다시 떠나기
            </Link>
            {user ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="relative z-10 min-h-[calc(100dvh-57px)] pb-20">
        <section className="border-ink/10 mx-auto max-w-[780px] border-b px-6 pt-12 pb-8 text-center lg:pt-14">
          <div className="mb-4 flex items-center justify-center gap-5">
            <span className="stamp">ARRIVED · {era.year}</span>
            <span className="font-mono text-[12px] tracking-[0.15em] opacity-65">
              {entryDate}
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

          <h1 className="font-display mx-auto max-w-[680px] text-[clamp(34px,5vw,58px)] leading-[1.04] tracking-[-0.03em] italic">
            {title}
          </h1>

          <div className="mt-5 inline-flex items-center gap-3 font-mono text-[12px] tracking-[0.08em] opacity-70">
            <div className="from-ember to-coral text-paper font-display grid h-9 w-9 place-items-center rounded-full bg-linear-to-br text-sm">
              {passengerInitial}
            </div>
            <span>{passengerName}의 여행기</span>
          </div>
        </section>

        <section className="mx-auto max-w-[780px] px-6 pt-10">
          <div className="my-10 flex justify-center">
            <figure className="bg-paper relative w-full max-w-[530px] rotate-[-1.2deg] p-3 pb-12 shadow-[0_1px_0_rgba(0,0,0,.05),0_18px_40px_-18px_rgba(0,0,0,.28)]">
              <div className="bg-paper-3 relative aspect-[4/5] overflow-hidden">
                {heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={`${country.name} ${era.title} 대표 사진`}
                    fill
                    sizes="(min-width: 1024px) 530px, 100vw"
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

          <article className="text-ink-2 mx-auto max-w-[680px] font-serif text-[19px] leading-[1.9]">
            <p className="text-pretty">{diaryEntry}</p>
          </article>
        </section>

        <ResultFooter
          diaryId={diary.id}
          initialIsPublic={diary.is_public}
          isOwner={isOwner}
          tags={tags}
        />
      </main>
    </div>
  );
}
