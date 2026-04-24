import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

const DIARY_COLUMNS =
  "id,user_id,country_code,era_id,title,body,hero_image_path,is_public,created_at";
const DIARY_IMAGE_BUCKET = "diary-images";
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export type DiaryRecord = Tables<"diaries">;

export type CreateDiaryInput = {
  body: string;
  countryCode: string;
  eraId: string;
  heroImagePath: string;
  title: string;
  userId: string;
};

export async function createDiary(
  supabase: SupabaseServerClient,
  { body, countryCode, eraId, heroImagePath, title, userId }: CreateDiaryInput,
) {
  const { data, error } = await supabase
    .from("diaries")
    .insert({
      body,
      country_code: countryCode,
      era_id: eraId,
      hero_image_path: heroImagePath,
      is_public: false,
      title,
      user_id: userId,
    })
    .select(DIARY_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Diary 저장에 실패했습니다. ${error.message}`);
  }

  if (!data) {
    throw new Error("Diary 저장 결과를 확인할 수 없습니다.");
  }

  return data;
}

export async function getDiaryById(supabase: SupabaseServerClient, id: string) {
  const { data, error } = await supabase
    .from("diaries")
    .select(DIARY_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Diary 조회에 실패했습니다. ${error.message}`);
  }

  return data;
}

export async function createDiaryHeroImageUrl(
  supabase: SupabaseServerClient,
  storagePath: string,
) {
  const { data, error } = await supabase.storage
    .from(DIARY_IMAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data.signedUrl) {
    throw new Error(
      `대표 이미지 URL 생성에 실패했습니다.${error ? ` ${error.message}` : ""}`,
    );
  }

  return data.signedUrl;
}
