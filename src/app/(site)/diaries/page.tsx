import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  createDiaryHeroImageUrlOrNull,
  getPublicDiaries,
} from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationByDiary } from "@/lib/time-machine/destination";

export const metadata: Metadata = {
  title: "Diaries — Timeleap",
  description: "Timeleap 공개 여행기를 둘러보세요.",
};

const PUBLIC_DIARY_LIMIT = 12;

function createExcerpt(body: string | null) {
  const normalizedBody = body?.replace(/\s+/g, " ").trim();

  if (!normalizedBody) {
    return "아직 공개된 여행기의 본문이 준비되지 않았습니다.";
  }

  return normalizedBody.length > 96
    ? `${normalizedBody.slice(0, 96)}...`
    : normalizedBody;
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

export default async function PublicDiariesPage() {
  const supabase = await createClient();
  const diaries = await getPublicDiaries(supabase, PUBLIC_DIARY_LIMIT);
  const diaryCards = await Promise.all(
    diaries.map(async (diary) => {
      const { country, era } = resolveDestinationByDiary({
        countryCode: diary.country_code,
        eraId: diary.era_id,
      });

      return {
        city: era.city,
        countryFlag: country.flag,
        countryName: country.name,
        createdAtLabel: formatDiaryDate(diary.created_at),
        eraTitle: era.title,
        eraYear: era.year,
        excerpt: createExcerpt(diary.body),
        heroImageUrl: await createDiaryHeroImageUrlOrNull(
          supabase,
          diary.hero_image_path,
        ),
        id: diary.id,
        title: diary.title?.trim() || era.sceneCards[0].title,
      };
    }),
  );

  return (
    <main className="relative z-10 mx-auto max-w-300 px-6 py-12 lg:py-16">
      <section className="border-ink/12 mb-10 border-b pb-8">
        <span className="stamp">PUBLIC ARCHIVE</span>
        <div className="mt-6 gap-6">
          <h1 className="font-display text-[clamp(48px,7vw,92px)] leading-[0.9] font-light tracking-[-0.035em]">
            둘러보기
          </h1>
          <p className="mt-4 max-w-xl text-[16px] opacity-65">
            다른 여행자들이 공개한 시대와 장소의 기록을 최신순으로 모았습니다.
          </p>
        </div>
      </section>

      {diaryCards.length > 0 ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {diaryCards.map((diary) => (
            <Link
              key={diary.id}
              href={`/diaries/${diary.id}`}
              className="border-ink/12 bg-paper/75 group overflow-hidden rounded-[14px] border shadow-[0_18px_40px_-30px_rgba(0,0,0,.45)] transition-transform hover:-translate-y-1"
            >
              <div className="bg-paper-3 relative aspect-[4/3] overflow-hidden">
                {diary.heroImageUrl ? (
                  <Image
                    src={diary.heroImageUrl}
                    alt={`${diary.countryName} ${diary.eraTitle} 여행 이미지`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,.45),transparent_26%),linear-gradient(135deg,#d8c39e,#8f6b48)]">
                    <span className="text-[42px]">{diary.countryFlag}</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] tracking-[.1em] uppercase opacity-55">
                  <span>
                    {diary.countryName} · {diary.eraYear}
                  </span>
                  <span>{diary.createdAtLabel}</span>
                </div>
                <h2 className="font-display text-[25px] leading-[1.05]">
                  {diary.title}
                </h2>
                <p className="mt-3 text-[13px] leading-[1.65] opacity-65">
                  {diary.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px] tracking-[.08em] uppercase opacity-55">
                  <span>{diary.city}</span>
                  <span>{diary.eraTitle}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="border-ink/12 bg-paper-2/55 rounded-[14px] border px-6 py-14 text-center">
          <p className="font-display text-[30px]">
            아직 공개된 여행기가 없습니다
          </p>
          <p className="mt-3 text-[14px] opacity-60">
            첫 공개 기록이 생기면 이곳에서 바로 둘러볼 수 있습니다.
          </p>
        </section>
      )}
    </main>
  );
}
