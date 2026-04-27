"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import {
  createPublicDiaryCacheTag,
  PUBLIC_FEED_CACHE_TAG,
} from "@/lib/cache/keys";
import {
  deleteDiaryWithHeroImage,
  updateDiaryVisibility as updateDiaryVisibilityRecord,
} from "@/lib/diaries/server";
import { createClient } from "@/lib/supabase/server";

const MY_DIARIES_PATH = "/me/diaries";

type DiaryVisibilityResult = {
  isPublic: boolean;
};

function createMyDiaryPath(diaryId: string) {
  return `${MY_DIARIES_PATH}/${diaryId}`;
}

function createDiaryPath(diaryId: string) {
  return `/diary/${diaryId}`;
}

function createFeedPath(diaryId: string) {
  return `/feed/${diaryId}`;
}

function readRequiredText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Diary 요청 값을 확인할 수 없습니다.");
  }

  return value.trim();
}

function readPublicTarget(formData: FormData) {
  const value = readRequiredText(formData, "isPublic");

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error("Diary 공개 상태 값을 확인할 수 없습니다.");
}

async function requireDiaryActionUser(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(createLoginRedirectPath(nextPath));
  }

  return { supabase, user };
}

function revalidateDiarySurfaces(diaryId: string) {
  revalidatePath(MY_DIARIES_PATH);
  revalidatePath(createMyDiaryPath(diaryId));
  revalidatePath(createDiaryPath(diaryId));
  revalidatePath(createFeedPath(diaryId));
  revalidateTag(PUBLIC_FEED_CACHE_TAG, "max");
  revalidateTag(createPublicDiaryCacheTag(diaryId), "max");
}

export async function setDiaryVisibility(
  diaryId: string,
  isPublic: boolean,
): Promise<DiaryVisibilityResult> {
  const { supabase, user } = await requireDiaryActionUser(
    createMyDiaryPath(diaryId),
  );
  const diary = await updateDiaryVisibilityRecord({
    id: diaryId,
    isPublic,
    supabase,
    userId: user.id,
  });

  revalidateDiarySurfaces(diary.id);

  return { isPublic: diary.is_public };
}

export async function updateDiaryVisibility(formData: FormData): Promise<void> {
  const diaryId = readRequiredText(formData, "diaryId");

  await setDiaryVisibility(diaryId, readPublicTarget(formData));
}

export async function deleteDiary(formData: FormData): Promise<void> {
  const diaryId = readRequiredText(formData, "diaryId");
  const { supabase, user } = await requireDiaryActionUser(
    createMyDiaryPath(diaryId),
  );
  const diary = await deleteDiaryWithHeroImage({
    id: diaryId,
    supabase,
    userId: user.id,
  });

  revalidateDiarySurfaces(diary.id);
  redirect(MY_DIARIES_PATH);
}
