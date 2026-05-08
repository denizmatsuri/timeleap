import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

const DIARY_COLUMNS =
  "id,user_id,country_code,era_id,generation_request_id,title,body,hero_image_path,is_public,created_at";
const DIARY_IMAGE_BUCKET = "diary-images";
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export type DiaryRecord = Tables<"diaries">;

export type CreateDiaryInput = {
  body: string;
  countryCode: string;
  eraId: string;
  generationRequestId: string;
  heroImagePath: string;
  title: string;
  userId: string;
};

export async function createDiary(
  supabase: SupabaseServerClient,
  {
    body,
    countryCode,
    eraId,
    generationRequestId,
    heroImagePath,
    title,
    userId,
  }: CreateDiaryInput,
) {
  const { data, error } = await supabase
    .from("diaries")
    .insert({
      body,
      country_code: countryCode,
      era_id: eraId,
      generation_request_id: generationRequestId,
      hero_image_path: heroImagePath,
      title,
      user_id: userId,
    })
    .select(DIARY_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingDiary = await getDiaryByGenerationRequestId({
        generationRequestId,
        supabase,
        userId,
      });

      if (existingDiary) {
        await supabase.storage.from(DIARY_IMAGE_BUCKET).remove([heroImagePath]);

        return existingDiary;
      }
    }

    throw new Error(`Diary 저장에 실패했습니다. ${error.message}`);
  }

  if (!data) {
    throw new Error("Diary 저장 결과를 확인할 수 없습니다.");
  }

  return data;
}

export async function getDiaryByGenerationRequestId({
  generationRequestId,
  supabase,
  userId,
}: {
  generationRequestId: string;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("diaries")
    .select(DIARY_COLUMNS)
    .eq("user_id", userId)
    .eq("generation_request_id", generationRequestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Diary 요청 조회에 실패했습니다. ${error.message}`);
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

export async function getUserDiaries(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("diaries")
    .select(DIARY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Diary 목록 조회에 실패했습니다. ${error.message}`);
  }

  return data;
}

export async function getPublicDiaries(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("diaries")
    .select(DIARY_COLUMNS)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`공개 Diary 목록 조회에 실패했습니다. ${error.message}`);
  }

  return data;
}

export async function getOwnedDiaryById({
  id,
  supabase,
  userId,
}: {
  id: string;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("diaries")
    .select(DIARY_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Diary 조회에 실패했습니다. ${error.message}`);
  }

  return data;
}

export async function updateDiaryVisibility({
  id,
  isPublic,
  supabase,
  userId,
}: {
  id: string;
  isPublic: boolean;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("diaries")
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("user_id", userId)
    .select(DIARY_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Diary 공개 상태 변경에 실패했습니다. ${error.message}`);
  }

  if (!data) {
    throw new Error("수정할 Diary를 찾을 수 없습니다.");
  }

  return data;
}

export async function deleteDiaryWithHeroImage({
  id,
  supabase,
  userId,
}: {
  id: string;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const diary = await getOwnedDiaryById({ id, supabase, userId });

  if (!diary) {
    throw new Error("삭제할 Diary를 찾을 수 없습니다.");
  }

  if (diary.hero_image_path) {
    const { error: storageError } = await supabase.storage
      .from(DIARY_IMAGE_BUCKET)
      .remove([diary.hero_image_path]);

    if (storageError) {
      throw new Error(
        `Diary 대표 이미지 삭제에 실패했습니다. ${storageError.message}`,
      );
    }
  }

  const { error } = await supabase
    .from("diaries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Diary 삭제에 실패했습니다. ${error.message}`);
  }

  return diary;
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

export async function createDiaryHeroImageUrlOrNull(
  supabase: SupabaseServerClient,
  storagePath: string | null,
) {
  if (!storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(DIARY_IMAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
