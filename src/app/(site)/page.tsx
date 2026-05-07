import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import LandingTicketCarousel, {
  type LandingTicketItem,
} from "@/components/landing/landing-ticket-carousel";
import type { User } from "@supabase/supabase-js";
import {
  createDiaryHeroImageUrlOrNull,
  getPublicDiaries,
} from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";
import {
  DESTINATION_COUNTRIES,
  type EraTone,
} from "@/lib/time-machine/destinations";
import type { Tables } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Timeleap — Impossible Days",
  description:
    "얼굴 사진으로 시대와 국가를 선택해 AI 사진과 일기를 생성하는 서비스입니다.",
};

const LANDING_PUBLIC_DIARY_LIMIT = 12;
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
type LandingProfile = Pick<Tables<"profiles">, "onboarding_completed_at">;

const HOW = [
  {
    n: "01",
    t: "얼굴을 올린다",
    d: "1~3장의 셀카면 충분합니다. 한 번만 등록하면 끝.",
  },
  {
    n: "02",
    t: "시대와 나라를 고른다",
    d: "지구본을 돌리고 타임라인을 당겨 좌표를 정합니다.",
  },
  {
    n: "03",
    t: '"출발" 버튼을 누른다',
    d: "타임머신이 가동되고, 눈앞에서 사진과 일기가 완성됩니다.",
  },
  {
    n: "04",
    t: "기록이 남는다",
    d: "나의 여행 일지에 차곡차곡. 원하면 세상과 공유합니다.",
  },
];
const SELFIE_TRANSFORM_INPUT_IMAGES = [
  {
    alt: "업로드 셀피 샘플 1",
    src: "/images/landing/selfie-transform-input-01.jpg",
  },
  {
    alt: "업로드 셀피 샘플 2",
    src: "/images/landing/selfie-transform-input-02.jpg",
  },
  {
    alt: "업로드 셀피 샘플 3",
    src: "/images/landing/selfie-transform-input-03.jpg",
  },
  {
    alt: "업로드 셀피 샘플 4",
    src: "/images/landing/selfie-transform-input-04.jpg",
  },
] as const;
const SELFIE_TRANSFORM_OUTPUT_IMAGE = {
  alt: "Timeleap AI 생성 사진 샘플",
  src: "/images/landing/selfie-transform-output.jpg",
} as const;
const HERO_TICKET_DIARY_IDS = [
  "51962237-a1fe-4df6-bc72-0e09c7d0d502",
  "191f722c-c122-4120-92ee-befd2568317a",
  "57a695fa-38fb-4ce4-a8fd-916f5b327643",
] as const;
const HERO_TICKET_ITEMS: readonly LandingTicketItem[] = [
  {
    alt: "Timeleap 1925년 뉴욕 여행 사진 샘플",
    arrivedLabel: "ARRIVED · 1925",
    city: "NEW YORK",
    era: "ROARING · 20s",
    gate: "01",
    href: `/diaries/${HERO_TICKET_DIARY_IDS[0]}`,
    passenger: "TIMELEAP",
    serial: "NO. 51962",
    src: "/images/landing/selfie-transform-output.jpg",
    year: "1925",
  },
  {
    alt: "Timeleap 시간여행 사진 샘플 2",
    arrivedLabel: "ARRIVED · 1936",
    city: "GYEONGSEONG",
    era: "MODERN · LIGHT",
    gate: "02",
    href: `/diaries/${HERO_TICKET_DIARY_IDS[1]}`,
    passenger: "TIMELEAP",
    serial: "NO. 191F7",
    src: "/images/landing/selfie-transform-output-02.jpg",
    year: "1936",
  },
  {
    alt: "Timeleap 시간여행 사진 샘플 3",
    arrivedLabel: "ARRIVED · 1987",
    city: "TOKYO",
    era: "BUBBLE · NIGHT",
    gate: "03",
    href: `/diaries/${HERO_TICKET_DIARY_IDS[2]}`,
    passenger: "TIMELEAP",
    serial: "NO. 57A69",
    src: "/images/landing/selfie-transform-output-03.jpg",
    year: "1987",
  },
] as const;
const SELFIE_TRANSFORM_ARROW_IMAGE = {
  alt: "셀피에서 생성 사진으로 이어지는 화살표",
  src: "/images/landing/selfie-transform-arrow.webp",
} as const;

function getLandingAction({
  authUser,
  profile,
}: {
  authUser: User | null;
  profile: LandingProfile | null;
}) {
  if (!authUser) {
    return {
      footerLabel: "무료로 시작하기",
      heroLabel: "타임머신 타러 가기",
      href: "/login",
    };
  }

  if (!profile?.onboarding_completed_at) {
    return {
      footerLabel: "탑승 준비하기",
      heroLabel: "탑승 준비하기",
      href: "/onboarding",
    };
  }

  return {
    footerLabel: "새 여행 시작하기",
    heroLabel: "타임머신 출발하기",
    href: "/time-machine",
  };
}

function createDestinationCards() {
  return DESTINATION_COUNTRIES.flatMap((country) =>
    country.eras.map((era) => ({
      blurb: era.blurb,
      city: era.city,
      countryCode: country.code,
      countryFlag: country.flag,
      countryName: country.name,
      eraId: era.id,
      id: `${country.code}-${era.id}`,
      label: era.year,
      title: era.title,
    })),
  );
}

function createDestinationHref({
  countryCode,
  eraId,
}: {
  countryCode: string;
  eraId: string;
}) {
  const searchParams = new URLSearchParams({
    country: countryCode,
    era: eraId,
  });

  return `/time-machine?${searchParams.toString()}`;
}

function createLoopedCards<T>(cards: T[]) {
  if (cards.length === 0) {
    return [];
  }

  const repeatCount = Math.max(1, Math.ceil(12 / cards.length));
  const repeatedCards = Array.from({ length: repeatCount }, () => cards).flat();

  return [...repeatedCards, ...repeatedCards];
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  let profile: LandingProfile | null = null;

  if (authUser) {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      throw new Error(`프로필 조회에 실패했습니다. ${error.message}`);
    }

    profile = data;
  }

  const landingAction = getLandingAction({ authUser, profile });
  const publicDiaries = await getPublicDiaries(
    supabase,
    LANDING_PUBLIC_DIARY_LIMIT,
  );
  const diaryCards = await Promise.all(
    publicDiaries.map(async (diary) => {
      const { country, era } = resolveDestinationByDiary({
        countryCode: diary.country_code,
        eraId: diary.era_id,
      });

      return {
        city: era.city,
        countryFlag: country.flag,
        countryName: country.name,
        eraTitle: era.title,
        eraYear: era.year,
        heroImageUrl: await createDiaryHeroImageUrlOrNull(
          supabase,
          diary.hero_image_path,
        ),
        id: diary.id,
        placeholderClassName: HERO_PHOTO_BY_TONE[era.tone],
        title: diary.title?.trim() || era.sceneCards[0].title,
      };
    }),
  );
  const destinationCards = createDestinationCards();
  const shiftedDiaryCards = [
    ...diaryCards.slice(Math.ceil(diaryCards.length / 2)),
    ...diaryCards.slice(0, Math.ceil(diaryCards.length / 2)),
  ];
  const scrollingDiaryCards = createLoopedCards(diaryCards);
  const alternateScrollingDiaryCards = createLoopedCards(shiftedDiaryCards);
  const scrollingDestinationCards = createLoopedCards(destinationCards);
  const totalEraCount = DESTINATION_COUNTRIES.reduce(
    (count, country) => count + country.eras.length,
    0,
  );

  return (
    <>
      <section className="overflow-hidden py-16 md:py-15 md:pb-25">
        <div className="mx-auto grid max-w-300 items-center gap-16 px-8 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-5">
              <span className="stamp">
                Since 2026 · Archive of Impossible Days
              </span>
            </div>
            <h1 className="hero-title font-display mb-7 text-[clamp(44px,7vw,92px)] leading-[0.95] font-light tracking-[-0.035em]">
              만약 내가
              <br />
              <em>1925년</em>의<br />
              뉴욕에
              <br />
              있었다면?
            </h1>
            <p className="mb-9 max-w-120 text-[17px] leading-[1.55] opacity-80">
              얼굴 사진 한 장이면, 당신은 어느 시대·어느 나라의 하루를 사진 몇
              장과 일기로 되돌려 받습니다.
            </p>
            <div className="mb-11 flex flex-wrap gap-3">
              <Link
                href={landingAction.href}
                className="bg-ink text-paper font-display inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap shadow-[0_2px_0_rgba(0,0,0,.1),0_10px_30px_-10px_rgba(0,0,0,.4)] transition-transform hover:-translate-y-0.5"
              >
                {landingAction.heroLabel}
              </Link>
              <Link
                href="/diaries"
                className="bg-ink/8 hover:bg-ink/14 font-display inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap transition-all hover:-translate-y-0.5"
              >
                공개 여행기 보기
              </Link>
            </div>
            <div className="border-ink/12 flex flex-wrap gap-9 border-t pt-5">
              {[
                { v: String(diaryCards.length), l: "최신 공개 샘플" },
                { v: String(totalEraCount), l: "시대 좌표" },
                { v: String(DESTINATION_COUNTRIES.length), l: "국가" },
              ].map(({ v, l }) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <strong className="font-display text-[22px] font-medium tracking-[-0.02em]">
                    {v}
                  </strong>
                  <span className="font-mono text-[10px] tracking-widest uppercase opacity-55">
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <LandingTicketCarousel tickets={HERO_TICKET_ITEMS} />
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2.5 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
                PUBLIC ARCHIVE
              </div>
              <h2 className="font-display m-0 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-[-0.02em]">
                다른 사람들의 불가능한 하루
              </h2>
            </div>
            <Link
              href="/diaries"
              className="bg-ink/8 hover:bg-ink/14 self-start rounded-full px-3 py-1.5 font-mono text-xs tracking-[.06em] whitespace-nowrap uppercase transition-colors sm:self-auto"
            >
              전체 보기
            </Link>
          </div>

          {diaryCards.length > 0 ? (
            <div className="archive-marquee -mx-6 space-y-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] py-2">
              {[
                {
                  animationClassName: "archive-marquee-track-left",
                  cards: scrollingDiaryCards,
                },
                {
                  animationClassName: "archive-marquee-track-right",
                  cards: alternateScrollingDiaryCards,
                },
              ].map((row, rowIndex) => (
                <div
                  key={row.animationClassName}
                  className={`archive-marquee-track flex w-max gap-3 px-6 sm:gap-4 ${row.animationClassName}`}
                >
                  {row.cards.map((diary, index) => (
                    <Link
                      key={`${rowIndex}-${index}-${diary.id}`}
                      href={`/diaries/${diary.id}`}
                      className="group bg-paper-3 relative block w-[136px] shrink-0 overflow-hidden rounded-[10px] shadow-[0_18px_44px_-28px_rgba(0,0,0,.46)] transition-transform duration-300 hover:-translate-y-1 sm:w-[156px] lg:w-[176px]"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        {diary.heroImageUrl ? (
                          <Image
                            src={diary.heroImageUrl}
                            alt={`${diary.countryName} ${diary.eraTitle} 여행 이미지`}
                            fill
                            sizes="(min-width: 1024px) 176px, (min-width: 640px) 156px, 136px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div
                            className={`absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04] ${diary.placeholderClassName}`}
                          />
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),transparent_36%,rgba(0,0,0,0.62))]" />
                        <div className="absolute top-2 right-2 flex max-w-[76%] items-center gap-1.5 rounded-full border border-white/35 bg-black/32 px-2 py-1 text-white shadow-[0_8px_22px_-12px_rgba(0,0,0,.8)] backdrop-blur-[2px] sm:top-3 sm:right-3">
                          <span className="text-[14px] sm:text-[16px]">
                            {diary.countryFlag}
                          </span>
                          <span className="truncate font-mono text-[8px] tracking-[.08em] uppercase sm:text-[9px]">
                            {diary.countryName}
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-3.5">
                          <div className="font-mono text-[8px] tracking-[.1em] text-white/62 uppercase sm:text-[9px]">
                            {diary.eraYear} · {diary.city}
                          </div>
                          <h3 className="font-display mt-1 line-clamp-2 text-[17px] leading-[1.02] tracking-[-0.01em] sm:text-[19px]">
                            {diary.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-ink/12 bg-paper-2/55 rounded-[14px] border px-6 py-14 text-center">
              <p className="font-display text-[30px]">
                아직 공개된 여행기가 없습니다
              </p>
              <p className="mt-3 text-[14px] opacity-60">
                첫 공개 기록이 생기면 이곳에서 바로 둘러볼 수 있습니다.
              </p>
              <Link
                href="/diaries"
                className="bg-ink text-paper mt-7 inline-flex rounded-full px-5 py-3 font-mono text-[11px] tracking-[.08em] uppercase transition-transform hover:-translate-y-0.5"
              >
                공개 아카이브로 이동
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-ink/10 bg-paper-2/45 border-y py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-10">
            <div>
              <div className="mb-2.5 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
                Face to Era
              </div>
              <h2 className="font-display m-0 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-[-0.02em]">
                셀피가 시간여행 사진이 되는 순간
              </h2>
              <p className="mt-4 max-w-[520px] text-[14px] leading-[1.65] opacity-65">
                몇 장의 얼굴 사진을 바탕으로 선택한 시대와 나라의 장면을
                완성합니다.
              </p>
            </div>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.78fr)_88px_minmax(0,1fr)] lg:gap-8">
            <div>
              <div className="mb-3 font-mono text-[10px] tracking-[.14em] uppercase opacity-45">
                Uploaded Photos
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-[500px]">
                {SELFIE_TRANSFORM_INPUT_IMAGES.map((image) => (
                  <div
                    key={image.src}
                    className="border-ink/12 bg-paper relative aspect-square overflow-hidden rounded-[8px] border shadow-[0_18px_40px_-30px_rgba(0,0,0,.45)]"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 1024px) 235px, (min-width: 640px) 45vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative h-18 w-28 scale-y-[-1] rotate-[139deg] lg:h-20 lg:w-32 lg:rotate-[49deg]">
                <Image
                  src={SELFIE_TRANSFORM_ARROW_IMAGE.src}
                  alt={SELFIE_TRANSFORM_ARROW_IMAGE.alt}
                  fill
                  sizes="128px"
                  className="object-contain"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 font-mono text-[10px] tracking-[.14em] uppercase opacity-45">
                Generated Memory
              </div>
              <div className="border-ink/12 bg-paper relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[8px] border shadow-[0_24px_58px_-38px_rgba(0,0,0,.58)] lg:mx-0">
                <Image
                  src={SELFIE_TRANSFORM_OUTPUT_IMAGE.src}
                  alt={SELFIE_TRANSFORM_OUTPUT_IMAGE.alt}
                  fill
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_54%,rgba(26,20,16,0.22))]" />
                <div className="absolute top-3 right-3">
                  <span className="stamp bg-paper/88 text-ember scale-[1.05] border-current px-4 py-2 text-[11px] shadow-[0_8px_22px_-16px_rgba(0,0,0,.8)]">
                    AI Generated
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-10 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
            HOW IT WORKS
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(({ n, t, d }) => (
              <div
                key={n}
                className="border-ink/15 bg-ink/3 hover:bg-ink/5 cursor-default rounded-xl border p-7 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-4 font-mono text-[11px] tracking-[.15em] opacity-45">
                  {n}
                </div>
                <div className="font-display mb-2 text-[20px] font-medium tracking-[-0.01em]">
                  {t}
                </div>
                <div className="text-sm leading-normal opacity-70">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-2.5 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
            DESTINATIONS
          </div>
          <h2 className="font-display mb-11 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-[-0.02em]">
            어느 시대로 떠나 볼까요
          </h2>
          <div className="archive-marquee -mx-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] py-2">
            <div className="archive-marquee-track archive-marquee-track-left flex w-max gap-4 px-6">
              {scrollingDestinationCards.map((destination, index) => (
                <Link
                  key={`${index}-${destination.id}`}
                  href={createDestinationHref({
                    countryCode: destination.countryCode,
                    eraId: destination.eraId,
                  })}
                  className="border-ink/14 bg-ink/3 hover:bg-ember/8 hover:border-ember/30 flex h-[216px] w-[232px] shrink-0 flex-col rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 sm:w-[260px]"
                >
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="text-[26px]">
                      {destination.countryFlag}
                    </span>
                    <span className="font-mono text-[11px] tracking-[.12em] opacity-60">
                      {destination.label}
                    </span>
                  </div>
                  <div className="font-display mb-1.5 line-clamp-2 text-[19px] leading-[1.18] font-medium tracking-[-0.01em]">
                    {destination.title}
                  </div>
                  <div className="mb-2 truncate font-mono text-[10px] tracking-[.08em] uppercase opacity-50">
                    {destination.countryName} · {destination.city}
                  </div>
                  <div className="line-clamp-3 text-xs leading-[1.4] opacity-70">
                    {destination.blurb}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 pb-16">
        <div className="mx-auto flex max-w-300 flex-col items-center gap-6 px-6 text-center">
          <h2 className="font-display m-0 text-[clamp(32px,4.5vw,56px)] font-normal tracking-[-0.02em] italic">
            당신의 첫 여행이 기다립니다.
          </h2>
          <Link
            href={landingAction.href}
            className="bg-ink text-paper font-display inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap shadow-[0_2px_0_rgba(0,0,0,.1),0_10px_30px_-10px_rgba(0,0,0,.4)] transition-transform hover:-translate-y-0.5"
          >
            {landingAction.footerLabel}
          </Link>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 font-mono text-[11px] opacity-50">
            <span>© 2026 Timeleap</span>
            <span>·</span>
            <a href="#" className="underline underline-offset-[3px]">
              이용약관
            </a>
            <span>·</span>
            <a href="#" className="underline underline-offset-[3px]">
              개인정보처리방침
            </a>
            <span>·</span>
            <a href="#" className="underline underline-offset-[3px]">
              문의
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
