import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
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
const DESTINATION_CARD_LIMIT = 9;
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
  const primaryDestinationCards = DESTINATION_COUNTRIES.map((country) => ({
    blurb: country.eras[0].blurb,
    city: country.eras[0].city,
    countryFlag: country.flag,
    countryName: country.name,
    id: `${country.code}-${country.eras[0].id}`,
    label: country.eras[0].year,
    title: country.eras[0].title,
  }));
  const secondaryDestinationCards = DESTINATION_COUNTRIES.flatMap((country) =>
    country.eras.slice(1).map((era) => ({
      blurb: era.blurb,
      city: era.city,
      countryFlag: country.flag,
      countryName: country.name,
      id: `${country.code}-${era.id}`,
      label: era.year,
      title: era.title,
    })),
  );

  return [...primaryDestinationCards, ...secondaryDestinationCards].slice(
    0,
    DESTINATION_CARD_LIMIT,
  );
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

          <div className="relative flex justify-center">
            <div className="bg-paper text-ink ticket-notch relative w-full max-w-105 -rotate-3 rounded-md shadow-[0_20px_50px_-20px_rgba(0,0,0,.5),0_4px_12px_rgba(0,0,0,.15)]">
              <div className="border-ink-3 flex items-center gap-3.5 border-b border-dashed px-5.5 py-4">
                <div className="flex flex-1 items-center gap-2.5">
                  <div>
                    <div className="font-display text-sm font-medium">
                      TIMELEAP
                    </div>
                    <div className="font-mono text-[9px] tracking-[.15em] opacity-60">
                      BOARDING PASS
                    </div>
                  </div>
                </div>
                <div className="flex-1" />
                <div className="font-mono text-[10px] tracking-[.15em] opacity-55">
                  NO. 00412
                </div>
              </div>

              <div className="p-5.5">
                <div className="flex items-end justify-between gap-3.5">
                  <div>
                    <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                      FROM
                    </div>
                    <div className="font-display flex flex-col text-[28px] leading-none font-medium tracking-tight">
                      2026
                      <span className="text-ember-2 mt-0.5 font-mono text-[10px] font-medium tracking-[.12em]">
                        SEOUL
                      </span>
                    </div>
                  </div>
                  <div className="text-ember pb-1 text-2xl">→</div>
                  <div>
                    <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                      TO
                    </div>
                    <div className="font-display flex flex-col text-[28px] leading-none font-medium tracking-tight">
                      1925
                      <span className="text-ember-2 mt-0.5 font-mono text-[10px] font-medium tracking-[.12em]">
                        NEW YORK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ph-ticket relative my-4 aspect-2/1 overflow-hidden rounded-sm" />

                <div className="flex justify-between gap-5">
                  {[
                    ["PASSENGER", "JIMIN · P"],
                    ["ERA", "ROARING · 20s"],
                    ["GATE", "04"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1 font-mono text-[9px] tracking-[.15em] uppercase opacity-55">
                        {label}
                      </div>
                      <div className="font-display text-sm font-medium">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-ink-3 border-t border-dashed px-5.5 pt-3 pb-4">
                <div className="barcode-bg h-5 rounded-sm opacity-75" />
              </div>
            </div>

            <div className="pointer-events-none absolute top-0 -right-2 rotate-12">
              <span className="stamp">DEPARTED</span>
            </div>
            <div className="pointer-events-none absolute bottom-5 -left-2 -rotate-[8deg]">
              <span className="stamp stamp-sage">ARRIVED · 1925</span>
            </div>
          </div>
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

      <section className="py-20">
        <div className="mx-auto max-w-300 px-6">
          <div className="mb-2.5 font-mono text-[11px] tracking-[.15em] uppercase opacity-55">
            DESTINATIONS
          </div>
          <h2 className="font-display mb-11 text-[clamp(32px,4vw,52px)] leading-[1.05] font-normal tracking-[-0.02em]">
            어느 시대로 떠나 볼까요
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {destinationCards.map((destination) => (
              <Link
                key={destination.id}
                href={landingAction.href}
                className="border-ink/14 bg-ink/3 hover:bg-ember/8 hover:border-ember/30 rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-[26px]">{destination.countryFlag}</span>
                  <span className="font-mono text-[11px] tracking-[.12em] opacity-60">
                    {destination.label}
                  </span>
                </div>
                <div className="font-display mb-1.5 text-[19px] font-medium tracking-[-0.01em]">
                  {destination.title}
                </div>
                <div className="mb-2 font-mono text-[10px] tracking-[.08em] uppercase opacity-50">
                  {destination.countryName} · {destination.city}
                </div>
                <div className="line-clamp-3 text-xs leading-[1.4] opacity-70">
                  {destination.blurb}
                </div>
              </Link>
            ))}
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
