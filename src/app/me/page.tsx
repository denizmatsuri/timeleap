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
    createProfilePhotoUrlOrNull(supabase, faceImages?.[0]?.storage_path ?? null),
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

      <main className="relative z-10 mx-auto max-w-300 px-6 py-10 lg:py-14">
        <section className="relative rounded-[18px] bg-[#93851f] p-3 shadow-[0_28px_70px_-36px_rgba(0,0,0,.65)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_20%_10%,rgba(255,237,150,.16),transparent_32%),repeating-linear-gradient(45deg,rgba(20,18,8,.05)_0,rgba(20,18,8,.05)_1px,transparent_1px,transparent_5px)]" />
          <div className="relative grid items-stretch overflow-hidden rounded-[10px] bg-[#d9b3a7] text-[#30231d] shadow-[0_18px_42px_-24px_rgba(0,0,0,.7)] lg:h-[720px] lg:grid-cols-2">
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 z-20 hidden w-9 -translate-x-1/2 bg-[linear-gradient(90deg,rgba(64,38,31,.24),rgba(255,244,221,.26)_45%,rgba(64,38,31,.18))] lg:block" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,.22),transparent_28%),repeating-linear-gradient(0deg,rgba(60,39,32,.05)_0,rgba(60,39,32,.05)_1px,transparent_1px,transparent_4px)]" />

            <div className="relative border-[#4a352b]/45 p-4 sm:p-5 lg:border-r lg:pr-8">
              <div className="border-[#4a352b]/60 relative h-full border p-4">
                <div className="absolute inset-2 border border-[#4a352b]/30" />
                <div className="relative">
                  <div className="space-y-2 font-mono text-[12px] leading-tight tracking-[.05em]">
                    <div>
                      <span className="opacity-55">1. Forename </span>
                      <strong className="tracking-[.12em] uppercase">
                        {passengerName}
                      </strong>
                    </div>
                    <div>
                      <span className="opacity-55">2. Residence </span>
                      <strong className="tracking-[.12em] uppercase">
                        TIMELEAP ARCHIVE
                      </strong>
                    </div>
                    <div>
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

                  <div className="mt-5 grid gap-3 sm:grid-cols-[76px_minmax(0,176px)_76px]">
                    <div className="[writing-mode:vertical-rl] self-stretch border-r border-dashed border-[#4a352b]/45 pr-2 text-center font-mono text-[10px] tracking-[.16em] uppercase opacity-60">
                      Recognition and credentials
                    </div>

                    <div className="relative aspect-[4/5] overflow-hidden border border-[#4a352b]/55 bg-[#ead8c8] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)]">
                      <div className="relative h-full overflow-hidden grayscale">
                        {profilePhotoUrl ? (
                          <Image
                            src={profilePhotoUrl}
                            alt={`${passengerName} 얼굴 사진`}
                            fill
                            sizes="(min-width: 1024px) 240px, 70vw"
                            className="object-cover sepia-[.28] contrast-[.95]"
                            unoptimized
                          />
                        ) : (
                          <div className="ph-gilded absolute inset-0" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3">
                    <div className="bg-ember/80 px-2 py-3 text-center font-mono text-[8px] leading-[1.25] tracking-[.12em] uppercase text-[#2b1b13] [writing-mode:vertical-rl]">
                        Office of time affairs
                      </div>
                      <div className="border-t border-dotted border-[#4a352b]/70 pt-2 font-mono text-[9px] tracking-[.12em] uppercase opacity-70">
                        Property of
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 font-mono text-[11px]">
                    <div className="border-b border-dotted border-[#4a352b]/70 pb-1">
                      <span className="opacity-55">5. Valid Until </span>
                      <strong className="font-display text-[22px] tracking-[.04em] text-[#8a5e74]">
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
                    <div className="grid place-items-center border border-[#4a352b]/45 p-3">
                      <div className="grid h-16 w-16 place-items-center rounded-full border border-[#6d4f85]/65 text-center font-mono text-[9px] leading-[1.25] tracking-[.1em] text-[#5d4974] opacity-75 rotate-[-12deg]">
                        Valid
                        <br />
                        Stamp
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3">
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
                        <div className="mt-1 font-mono text-[8px] tracking-[.16em] uppercase opacity-55">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/time-machine"
                      className="bg-ink text-paper font-display inline-flex rounded-full px-5 py-3 text-[14px] tracking-[-0.01em] transition-transform hover:-translate-y-px"
                    >
                      다시 떠나기
                    </Link>
                    <Link
                      href="/onboarding"
                      className="inline-flex rounded-full border border-[#4a352b]/45 px-5 py-3 font-mono text-[11px] tracking-[.08em] uppercase opacity-70 transition-opacity hover:opacity-100"
                    >
                      프로필 수정
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <aside className="relative min-h-0 overflow-hidden p-4 sm:p-5 lg:pl-8">
              <div className="border-[#4a352b]/60 relative flex h-full min-h-0 flex-col overflow-hidden border p-4">
                <div className="absolute inset-2 border border-[#4a352b]/30" />
                <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[#4a352b]/50 pb-3">
                  <div>
                    <div className="font-mono text-[10px] tracking-[.16em] uppercase opacity-55">
                      Identifications as of late
                    </div>
                    <h2 className="font-display mt-2 text-[34px] leading-none tracking-[-0.03em]">
                      수집된 도장
                    </h2>
                  </div>
                  <div className="font-mono text-[14px] opacity-65">
                    {visitedEraIds.size}/{allEras.length}
                  </div>
                </div>

                <div className="relative mt-4 grid min-h-0 flex-1 grid-cols-2 content-start overflow-y-auto overscroll-contain border-t border-l border-[#4a352b]/40 pr-1 sm:grid-cols-3">
                  {allEras.map((era) => {
                    const isVisited = visitedEraIds.has(era.id);

                    return (
                      <div
                        key={era.id}
                        className="relative min-h-[104px] border-r border-b border-[#4a352b]/40 p-2"
                      >
                        {isVisited ? (
                          <div className="relative mx-auto min-h-[82px] border border-[#4a352b]/30 bg-[#efe2c9] px-2 py-2 text-center text-[#5a392c] shadow-[0_8px_18px_-14px_rgba(0,0,0,.65)] even:rotate-[2deg] odd:rotate-[-2deg]">
                            <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_5px,rgba(74,53,43,.35)_5px,rgba(74,53,43,.35)_7px)]" />
                            <div className="mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full border border-current/45 text-[16px]">
                              {era.countryFlag}
                            </div>
                            <div className="mt-1.5 font-mono text-[8px] tracking-[.12em] opacity-65">
                              {era.year}
                            </div>
                            <div className="mt-1 line-clamp-2 font-display text-[12px] leading-tight tracking-[-0.01em]">
                              {era.label}
                            </div>
                          </div>
                        ) : (
                          <div className="grid h-full min-h-[82px] place-items-center border border-dashed border-[#4a352b]/24 bg-[#ead0c3]/35 px-2 text-center opacity-34">
                            <div>
                              <div className="font-mono text-[8px] tracking-[.12em]">
                                {era.year}
                              </div>
                              <div className="mt-1 line-clamp-2 font-display text-[12px] leading-tight tracking-[-0.01em]">
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDiaryItems.map((diary) => (
                <Link
                  key={diary.id}
                  href={`/me/diaries/${diary.id}`}
                  className="group border-ink/12 bg-ink/4 flex min-h-[440px] flex-col overflow-hidden rounded-[10px] border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-18px_rgba(0,0,0,.4)]"
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
                    <h3 className="font-display text-[24px] leading-[1.08] tracking-[-0.02em]">
                      {diary.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-[14px] leading-[1.65] opacity-70">
                      {diary.excerpt}
                    </p>
                    <div className="border-ink/10 mt-auto flex items-center justify-between border-t pt-4 font-mono text-[11px] tracking-[.08em] opacity-60">
                      <span>{diary.eraTitle}</span>
                      <span>열기 →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {diaryItems.length > 0 ? (
            <div className="border-ink/12 mt-8 grid gap-3 rounded-[14px] border bg-paper-2/45 p-5 sm:grid-cols-3">
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
