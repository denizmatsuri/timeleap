import type { Metadata } from "next";
import DiaryPhotoCard from "@/components/diaries/diary-photo-card";
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

  if (normalizedBody.length <= 96) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, 96)}…`;
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
        eraTone: era.tone,
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
        <section className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-3">
          {diaryCards.map((diary, index) => (
            <DiaryPhotoCard
              key={diary.id}
              countryFlag={diary.countryFlag}
              countryName={diary.countryName}
              createdAtLabel={diary.createdAtLabel}
              eraTone={diary.eraTone}
              eraYear={diary.eraYear}
              excerpt={diary.excerpt}
              footerLabel={`PUBLIC · ${diary.city} · ${diary.eraTitle}`}
              href={`/diaries/${diary.id}`}
              imageAlt={`${diary.countryName} ${diary.eraTitle} 대표 사진`}
              imageUrl={diary.heroImageUrl}
              index={index}
              title={diary.title}
              titleElement="h2"
            />
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
