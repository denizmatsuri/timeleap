import Link from "next/link";
import type { Metadata } from "next";
import { signOut } from "@/actions/auth";
import ResultFooter from "@/app/diary/_components/result-footer";
import {
  DESTINATION_COUNTRIES,
  type DestinationCountry,
  type DestinationEra,
  type EraTone,
} from "@/app/time-machine/_data/time-machine-destinations";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Diary — Timeleap",
  description: "Timeleap 타임머신 도착 이후 보여주는 결과 여행기 페이지",
};

const DEFAULT_COUNTRY =
  DESTINATION_COUNTRIES.find((country) => country.code === "US") ??
  DESTINATION_COUNTRIES[0];

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

type DiaryPageProps = {
  searchParams: Promise<{
    country?: string | string[];
    era?: string | string[];
  }>;
};

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isDestinationCountryCode(
  value: string | undefined,
): value is DestinationCountry["code"] {
  if (!value) {
    return false;
  }

  return DESTINATION_COUNTRIES.some((country) => country.code === value);
}

function resolveDestination({
  countryCode,
  eraId,
}: {
  countryCode?: string;
  eraId?: string;
}) {
  if (eraId) {
    const matchedCountry = DESTINATION_COUNTRIES.find((country) =>
      country.eras.some((era) => era.id === eraId),
    );

    if (matchedCountry) {
      const matchedEra = matchedCountry.eras.find((era) => era.id === eraId);

      if (matchedEra) {
        return {
          country: matchedCountry,
          era: matchedEra,
        };
      }
    }
  }

  if (isDestinationCountryCode(countryCode)) {
    const matchedCountry = DESTINATION_COUNTRIES.find(
      (country) => country.code === countryCode,
    );

    if (matchedCountry) {
      return {
        country: matchedCountry,
        era: matchedCountry.eras[0],
      };
    }
  }

  return {
    country: DEFAULT_COUNTRY,
    era: DEFAULT_COUNTRY.eras[0],
  };
}

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

function createEntryDate(era: DestinationEra) {
  const seed = era.id
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const month = String((seed % 12) + 1).padStart(2, "0");
  const day = String((seed % 28) + 1).padStart(2, "0");

  return `${era.year}.${month}.${day}`;
}

function createDiaryTitle(era: DestinationEra) {
  return `${era.sceneCards[0].title}`;
}

function buildDiaryEntry({
  country,
  era,
  passengerName,
}: {
  country: DestinationCountry;
  era: DestinationEra;
  passengerName: string;
}) {
  const arrivalScene = era.sceneCards[0];

  return `${era.year}년 ${era.city}의 ${arrivalScene.title} 앞에 서 있자 ${arrivalScene.note}가 먼저 피부에 닿았다. ${passengerName}는 ${era.wardrobe} 차림으로 그 풍경 한가운데에 자연스럽게 스며들었고, ${country.name}의 ${era.title}은 ${era.texture}와 ${era.soundtrack}의 결까지 포함한 채 오늘 하루를 아주 짧고 또렷한 기억으로 남겨 두었다.`;
}

export default async function DiaryPage({ searchParams }: DiaryPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile, error: profileError } = user
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  if (profileError) {
    throw new Error(`Failed to load diary profile: ${profileError.message}`);
  }

  const resolvedSearchParams = await searchParams;
  const { country, era } = resolveDestination({
    countryCode: readQueryValue(resolvedSearchParams.country),
    eraId: readQueryValue(resolvedSearchParams.era),
  });
  const passengerName = getPassengerName({
    displayName: profile?.display_name,
    email: user?.email,
  });
  const passengerInitial = getPassengerInitial(passengerName);
  const entryDate = createEntryDate(era);
  const title = createDiaryTitle(era);
  const diaryEntry = buildDiaryEntry({
    country,
    era,
    passengerName,
  });
  const heroPhotoClass = HERO_PHOTO_BY_TONE[era.tone];
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
            <figure className="bg-paper relative w-full max-w-[430px] rotate-[-1.2deg] p-3 pb-12 shadow-[0_1px_0_rgba(0,0,0,.05),0_18px_40px_-18px_rgba(0,0,0,.28)]">
              <div className="bg-paper-3 relative aspect-[4/5] overflow-hidden">
                <div className={`${heroPhotoClass} absolute inset-0`} />
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

        <ResultFooter tags={tags} />
      </main>
    </div>
  );
}
