import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth";
import { AGE_RANGE_OPTIONS, GENDER_OPTIONS } from "@/lib/auth/profile-options";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import {
  createDiaryHeroImageUrlOrNull,
  getUserDiaries,
  type DiaryRecord,
} from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";
import {
  DESTINATION_COUNTRIES,
  type EraTone,
} from "@/app/time-machine/_data/time-machine-destinations";

export const metadata: Metadata = {
  title: "My Profile — Timeleap",
  description: "내 Timeleap 프로필과 여행 기록",
};

const FACE_IMAGE_BUCKET = "face-images";
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

type SearchParams = Promise<{
  visibility?: string | string[];
}>;

type ProfilePageProps = {
  searchParams: SearchParams;
};

type VisibilityFilter = "all" | "private" | "public";

type DiaryListItem = {
  city: string;
  countryFlag: string;
  countryName: string;
  createdAtLabel: string;
  eraId: string;
  eraTitle: string;
  eraYear: string;
  excerpt: string;
  heroImageUrl: string | null;
  id: string;
  isPublic: boolean;
  placeholderClassName: string;
  title: string;
};

const DIARY_CARD_ROTATE_CLASSES = [
  "rotate-[-0.45deg]",
  "rotate-[0.35deg]",
  "rotate-[-0.2deg]",
  "rotate-[0.55deg]",
  "rotate-[-0.65deg]",
  "rotate-[0.15deg]",
] as const;

function toLabelMap(options: ReadonlyArray<{ label: string; value: string }>) {
  return Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  ) as Record<string, string>;
}

const GENDER_LABELS = toLabelMap(GENDER_OPTIONS);
const AGE_RANGE_LABELS = toLabelMap(AGE_RANGE_OPTIONS);

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

  return localPart || "여행자";
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

function formatJoinedDate(createdAt?: string | null) {
  if (!createdAt) {
    return "가입일 미확인";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return `가입 ${createdAt.slice(0, 7).replace("-", ".")}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `가입 ${year}.${month}`;
}

function createExcerpt(body: string | null) {
  const normalizedBody = body?.replace(/\s+/g, " ").trim();

  if (!normalizedBody) {
    return "아직 본문이 정리되지 않은 여행기입니다.";
  }

  if (normalizedBody.length <= 96) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, 96)}…`;
}

function normalizeVisibilityFilter(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === "public" || rawValue === "private") {
    return rawValue;
  }

  return "all";
}

function filterDiaryItems(
  diaryItems: DiaryListItem[],
  visibilityFilter: VisibilityFilter,
) {
  if (visibilityFilter === "public") {
    return diaryItems.filter((diary) => diary.isPublic);
  }

  if (visibilityFilter === "private") {
    return diaryItems.filter((diary) => !diary.isPublic);
  }

  return diaryItems;
}

async function createProfilePhotoUrlOrNull(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string | null,
) {
  if (!storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(FACE_IMAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data.signedUrl) {
    return null;
  }

  return data.signedUrl;
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
    eraId: era.id,
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

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { visibility } = await searchParams;
  const visibilityFilter = normalizeVisibilityFilter(visibility);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(createLoginRedirectPath("/me"));
  }

  const [
    { data: profile, error: profileError },
    { data: faceImages, error: faceImagesError },
    diaries,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("age_range,created_at,display_name,gender")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_face_images")
      .select("storage_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    getUserDiaries(supabase, user.id),
  ]);

  if (profileError) {
    throw new Error(`프로필을 읽지 못했습니다. ${profileError.message}`);
  }

  if (faceImagesError) {
    throw new Error(`얼굴 사진을 읽지 못했습니다. ${faceImagesError.message}`);
  }

  const [profilePhotoUrl, diaryItems] = await Promise.all([
    createProfilePhotoUrlOrNull(
      supabase,
      faceImages?.[0]?.storage_path ?? null,
    ),
    Promise.all(diaries.map((diary) => toDiaryListItem(supabase, diary))),
  ]);
  const filteredDiaryItems = filterDiaryItems(diaryItems, visibilityFilter);
  const visitedEraIds = new Set(diaryItems.map((diary) => diary.eraId));
  const visitedCountryNames = new Set(
    diaryItems.map((diary) => diary.countryName),
  );
  const publicCount = diaryItems.filter((diary) => diary.isPublic).length;
  const privateCount = diaryItems.length - publicCount;
  const passengerName = getPassengerName({
    displayName: profile?.display_name,
    email: user.email,
  });
  const genderLabel =
    (profile?.gender && GENDER_LABELS[profile.gender]) || "성별 미입력";
  const ageRangeLabel =
    (profile?.age_range && AGE_RANGE_LABELS[profile.age_range]) ||
    "연령대 미입력";
  const joinedDateLabel = formatJoinedDate(profile?.created_at);
  const passportSerial = user.id.slice(0, 8).toUpperCase();
  const visibilityFilters: ReadonlyArray<{
    href: string;
    label: string;
    value: VisibilityFilter;
  }> = [
    { href: "/me", label: "전체", value: "all" },
    { href: "/me?visibility=public", label: "공개", value: "public" },
    { href: "/me?visibility=private", label: "비공개", value: "private" },
  ];
  const allEras = DESTINATION_COUNTRIES.flatMap((country) =>
    country.eras.map((era) => ({
      countryFlag: country.flag,
      id: era.id,
      label: era.title,
      year: era.year,
    })),
  );

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
            <Link
              href="/me/diaries"
              className="border-ink/12 bg-paper-2/70 hidden rounded-full border px-3 py-2 font-mono text-[10px] tracking-[.08em] opacity-55 transition-opacity hover:opacity-100 sm:inline-flex"
            >
              DIARIES
            </Link>
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

      <main className="relative z-10 mx-auto max-w-300 px-3 py-6 sm:px-6 sm:py-10 lg:py-14">
        <section className="relative rounded-[14px] bg-[#7b5839] p-1.5 shadow-[0_28px_70px_-36px_rgba(0,0,0,.65)] sm:rounded-[18px] sm:p-2">
          <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_20%_10%,rgba(255,237,150,.16),transparent_32%),repeating-linear-gradient(45deg,rgba(20,18,8,.05)_0,rgba(20,18,8,.05)_1px,transparent_1px,transparent_5px)]" />
          <div className="relative grid items-stretch overflow-hidden rounded-[10px] bg-[#ead9b9] bg-[url('/images/passport-linen-texture.png')] bg-[length:520px_347px] bg-repeat text-[#30231d] bg-blend-multiply shadow-[0_18px_42px_-24px_rgba(0,0,0,.6)] lg:h-[720px] lg:grid-cols-2">
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 z-20 hidden w-9 -translate-x-1/2 bg-[linear-gradient(90deg,rgba(64,38,31,.24),rgba(255,244,221,.26)_45%,rgba(64,38,31,.18))] lg:block" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,255,255,.28),transparent_28%),radial-gradient(circle_at_78%_22%,rgba(116,79,42,.12),transparent_26%),radial-gradient(circle_at_54%_78%,rgba(255,248,218,.2),transparent_30%),repeating-linear-gradient(0deg,rgba(60,39,32,.055)_0,rgba(60,39,32,.055)_1px,transparent_1px,transparent_4px)]" />

            <div className="relative p-2 sm:p-5 lg:border-r lg:border-[#4a352b]/45 lg:pr-8">
              <div className="relative h-full border-[#4a352b]/60 p-3 sm:border sm:p-4">
                {/* <div className="absolute inset-2 border border-[#4a352b]/30" /> */}
                <div className="relative">
                  <div className="space-y-1.5 font-mono text-[11px] leading-tight tracking-[.03em] sm:space-y-2 sm:text-[12px] sm:tracking-[.05em]">
                    <div>
                      <span className="opacity-55">1. Forename </span>
                      <strong className="tracking-[.12em] uppercase">
                        {passengerName}
                      </strong>
                    </div>
                    <div className="hidden sm:block">
                      <span className="opacity-55">2. Residence </span>
                      <strong className="tracking-[.12em] uppercase">
                        TIMELEAP ARCHIVE
                      </strong>
                    </div>
                    <div className="hidden sm:block">
                      <span className="opacity-55">3. Document No. </span>
                      <strong className="tracking-[.12em] uppercase">
                        {passportSerial}
                      </strong>
                    </div>
                    <div>
                      <span className="opacity-55">4. Profile </span>
                      <strong className="tracking-[.08em] uppercase">
                        {ageRangeLabel} / {genderLabel}
                      </strong>
                    </div>
                    <div>
                      <span className="opacity-55">5. Issued </span>
                      <strong className="tracking-[.08em] uppercase">
                        {joinedDateLabel}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 justify-items-center gap-3 sm:mt-5 sm:grid-cols-[76px_minmax(0,176px)_76px]">
                    <div className="hidden self-stretch border-r border-dashed border-[#4a352b]/45 pr-2 text-center font-mono text-[10px] tracking-[.16em] uppercase opacity-60 [writing-mode:vertical-rl] sm:block">
                      Recognition and credentials
                    </div>

                    <div className="relative aspect-[4/5] w-[220px] max-w-full overflow-hidden border border-[#4a352b]/45 bg-[#f2e4c7] bg-[url('/images/passport-linen-texture.png')] bg-[length:360px_240px] bg-repeat p-2 bg-blend-multiply shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] sm:w-full sm:max-w-none">
                      <div className="relative h-full overflow-hidden grayscale">
                        {profilePhotoUrl ? (
                          <Image
                            src={profilePhotoUrl}
                            alt={`${passengerName} 얼굴 사진`}
                            fill
                            sizes="(min-width: 1024px) 240px, 70vw"
                            className="object-cover contrast-[.95] sepia-[.28]"
                            unoptimized
                          />
                        ) : (
                          <div className="ph-gilded absolute inset-0" />
                        )}
                      </div>
                    </div>

                    <div className="hidden flex-col justify-between gap-3 sm:flex">
                      <div className="bg-ember/80 px-2 py-3 text-center font-mono text-[8px] leading-[1.25] tracking-[.12em] text-[#2b1b13] uppercase [writing-mode:vertical-rl]">
                        Office of time affairs
                      </div>
                      <div className="border-t border-dotted border-[#4a352b]/70 pt-2 font-mono text-[9px] tracking-[.12em] uppercase opacity-70">
                        Property of
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 font-mono text-[10px] sm:text-[11px]">
                    <div className="border-b border-dotted border-[#4a352b]/70 pb-1">
                      <span className="opacity-55">5. Valid Until </span>
                      <strong className="font-display text-[22px] tracking-[.04em] text-[#7b5839]">
                        12.2026
                      </strong>
                    </div>
                    <div className="border-b border-dotted border-[#4a352b]/70 pb-1">
                      <span className="opacity-55">6. Collection </span>
                      <strong className="tracking-[.12em] uppercase">
                        {visitedEraIds.size}/{allEras.length} stamps
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_108px]">
                    <div>
                      <div className="font-mono text-[10px] tracking-[.14em] uppercase opacity-60">
                        Signature of the holder
                      </div>
                      <div className="font-handwriting mt-2 border-b border-dotted border-[#4a352b]/70 pb-1 text-[30px] leading-none">
                        {passengerName}
                      </div>
                    </div>
                    <div className="hidden place-items-center border border-[#4a352b]/45 p-3 sm:grid">
                      <div className="grid h-16 w-16 rotate-[-12deg] place-items-center rounded-full border border-[#6d4f85]/65 text-center font-mono text-[9px] leading-[1.25] tracking-[.1em] text-[#5d4974] opacity-75">
                        Valid
                        <br />
                        Stamp
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { label: "Trips", value: diaryItems.length },
                      { label: "Eras", value: visitedEraIds.size },
                      { label: "Nations", value: visitedCountryNames.size },
                      { label: "Public", value: publicCount },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="border-t border-[#4a352b]/35 pt-2"
                      >
                        <div className="font-display text-[24px] leading-none tracking-[-0.03em]">
                          {item.value}
                        </div>
                        <div className="mt-1 font-mono text-[7px] tracking-[.1em] uppercase opacity-55 sm:text-[8px] sm:tracking-[.16em]">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap">
                    <Link
                      href="/onboarding"
                      className="inline-flex rounded-full border border-[#4a352b] bg-[#4a352b] px-5 py-3 font-mono text-[11px] font-semibold tracking-[.08em] text-[#fff8ea] uppercase shadow-[0_10px_24px_-18px_rgba(25,18,12,.75)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a352b]"
                    >
                      여권 수정
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <aside className="relative min-h-0 overflow-hidden p-2 sm:p-5 lg:pl-8">
              <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-[#4a352b]/60 p-3 sm:border sm:p-4">
                {/* <div className="absolute inset-2 border border-[#4a352b]/30" /> */}
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[#4a352b]/50 pb-3">
                  <div>
                    <div className="font-mono text-[9px] tracking-[.14em] uppercase opacity-55 sm:text-[10px] sm:tracking-[.16em]">
                      Identifications as of late
                    </div>
                    <h2 className="font-display mt-1.5 text-[28px] leading-none tracking-[-0.03em] sm:mt-2 sm:text-[34px]">
                      수집된 도장
                    </h2>
                  </div>
                  <div className="font-mono text-[18px] opacity-65 sm:text-[24px]">
                    {visitedEraIds.size}/{allEras.length}
                  </div>
                </div>

                <div className="relative mt-3 grid min-h-0 flex-1 grid-cols-3 content-start overflow-y-auto overscroll-contain pr-1 sm:mt-4">
                  {allEras.map((era) => {
                    const isVisited = visitedEraIds.has(era.id);

                    return (
                      <div
                        key={era.id}
                        className="relative min-h-[88px] p-1 sm:min-h-[104px] sm:p-2"
                      >
                        {isVisited ? (
                          <div className="relative mx-auto min-h-[76px] bg-[#ffffff] bg-[url('/images/passport-linen-texture.png')] bg-[length:260px_173px] bg-repeat px-1.5 py-2 text-center text-[#5a392c] bg-blend-multiply shadow-[0_8px_18px_-14px_rgba(0,0,0,.48)] odd:rotate-[-1deg] even:rotate-[1deg] sm:min-h-[82px] sm:px-2 sm:odd:rotate-[-2deg] sm:even:rotate-[2deg]">
                            <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_5px,rgba(74,53,43,.35)_5px,rgba(74,53,43,.35)_7px)]" />
                            <div className="mx-auto mt-1 grid h-6 w-6 place-items-center rounded-full border border-current/45 text-[14px] sm:h-7 sm:w-7 sm:text-[16px]">
                              {era.countryFlag}
                            </div>
                            <div className="mt-1 font-mono text-[7px] tracking-[.1em] sm:mt-1.5 sm:text-[8px] sm:tracking-[.12em]">
                              {era.year}
                            </div>
                            <div className="font-display mt-1 line-clamp-2 text-[11px] leading-tight tracking-[-0.01em] sm:text-[12px]">
                              {era.label}
                            </div>
                          </div>
                        ) : (
                          <div className="grid h-full min-h-[76px] place-items-center border border-dashed bg-center px-1 text-center bg-blend-multiply sm:min-h-[82px] sm:px-2">
                            <div>
                              <div className="font-mono text-[7px] tracking-[.1em] sm:text-[8px] sm:tracking-[.12em]">
                                {era.year}
                              </div>
                              <div className="font-display mt-1 line-clamp-2 text-[11px] leading-tight tracking-[-0.01em] sm:text-[12px]">
                                {era.label}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="pt-12">
          <div className="border-ink/12 mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[11px] tracking-[.16em] opacity-55">
                PRIVATE ARCHIVE
              </div>
              <h2 className="font-display mt-2 text-[38px] leading-none tracking-[-0.03em]">
                나의 여행 기록
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {visibilityFilters.map((filter) => (
                <Link
                  key={filter.value}
                  href={filter.href}
                  className={`rounded-full px-4 py-2 font-mono text-[11px] tracking-[.08em] transition-colors ${
                    visibilityFilter === filter.value
                      ? "bg-ink text-paper"
                      : "border-ink/12 bg-ink/4 border opacity-65 hover:opacity-100"
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>

          {filteredDiaryItems.length === 0 ? (
            <div className="border-ink/12 bg-ink/4 mx-auto max-w-[720px] rounded-[14px] border px-7 py-12 text-center">
              <div className="font-mono text-[11px] tracking-[.16em] opacity-55">
                NO TRIP YET
              </div>
              <h3 className="font-display mt-3 text-[34px] leading-tight tracking-[-0.03em]">
                아직 표시할 여행 기록이 없습니다
              </h3>
              <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-[1.7] opacity-70">
                타임머신을 가동하면 시대와 나라별 여행 기록이 이곳에 쌓입니다.
              </p>
              <Link
                href="/time-machine"
                className="bg-ink text-paper font-display mt-7 inline-flex rounded-full px-7 py-4 text-[15px] tracking-[-0.01em] transition-transform hover:-translate-y-px"
              >
                첫 여행 떠나기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-3">
              {filteredDiaryItems.map((diary, index) => (
                <Link
                  key={diary.id}
                  href={`/me/diaries/${diary.id}`}
                  className={`group relative flex flex-col bg-[#fffaed] p-3 pb-5 shadow-[0_1px_0_rgba(0,0,0,.05),0_18px_40px_-20px_rgba(0,0,0,.32)] transition-all duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,.36)] ${DIARY_CARD_ROTATE_CLASSES[index % DIARY_CARD_ROTATE_CLASSES.length]}`}
                >
                  <div className="bg-paper-3 relative aspect-[4/5] overflow-hidden">
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
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.22))]" />
                    <div className="absolute bottom-3 left-3 rounded-sm bg-black/30 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white/75 uppercase">
                      {diary.createdAtLabel}
                    </div>
                  </div>

                  <div className="px-2 pt-4 text-center">
                    <div className="mb-2 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[.1em] opacity-55">
                      <span>{diary.countryFlag}</span>
                      <span>
                        {diary.countryName} · {diary.eraYear}
                      </span>
                    </div>
                    <h3 className="font-handwriting text-ink-2 line-clamp-2 text-[24px] leading-[1.05]">
                      {diary.title}
                    </h3>
                    <div className="mt-2 font-mono text-[9px] tracking-[.12em] opacity-42">
                      {diary.isPublic ? "PUBLIC" : "PRIVATE"} · {diary.city}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {diaryItems.length > 0 ? (
            <div className="border-ink/12 bg-paper-2/45 mt-8 grid gap-3 rounded-[14px] border p-5 sm:grid-cols-3">
              {[
                { label: "전체 기록", value: diaryItems.length },
                { label: "공개 기록", value: publicCount },
                { label: "비공개 기록", value: privateCount },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline gap-3">
                  <strong className="font-display text-[30px] leading-none tracking-[-0.03em]">
                    {item.value}
                  </strong>
                  <span className="font-mono text-[10px] tracking-[.12em] opacity-55">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
