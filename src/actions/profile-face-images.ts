"use server";

import { redirect } from "next/navigation";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import {
  AI_FACE_IMAGE_EXTENSION,
  AI_FACE_IMAGE_INPUT_MAX_BYTES,
  normalizeAiFaceImage,
} from "@/lib/images/ai-face-image";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

const FACE_IMAGE_BUCKET = "face-images";
const MAX_FACE_IMAGE_COUNT = 10;

export type UploadProfileFaceImageResult =
  | {
      error: string;
      storagePath: null;
    }
  | {
      error: null;
      storagePath: string;
    };

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function sanitizeFileBaseName(fileName: string) {
  const [baseName] = fileName.split(".");
  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitizedBaseName || "face-photo";
}

function createFaceImageStoragePath({
  fileName,
  userId,
}: {
  fileName: string;
  userId: string;
}) {
  const fileBaseName = sanitizeFileBaseName(fileName);

  return `${userId}/${crypto.randomUUID()}-${fileBaseName}.${AI_FACE_IMAGE_EXTENSION}`;
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(createLoginRedirectPath("/onboarding"));
  }

  return { supabase, user };
}

export async function uploadProfileFaceImage(
  formData: FormData,
): Promise<UploadProfileFaceImageResult> {
  const { supabase, user } = await requireAuthenticatedUser();
  const file = formData.get("photo");

  if (!isFile(file)) {
    return { error: "업로드할 사진을 찾지 못했습니다.", storagePath: null };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "이미지 파일만 업로드할 수 있어요.", storagePath: null };
  }

  if (file.size > AI_FACE_IMAGE_INPUT_MAX_BYTES) {
    return { error: "이미지는 10MB 이하로 올려 주세요.", storagePath: null };
  }

  const { count, error: countError } = await supabase
    .from("profile_face_images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return {
      error: "기존 얼굴 사진 정보를 확인하지 못했습니다.",
      storagePath: null,
    };
  }

  if ((count ?? 0) >= MAX_FACE_IMAGE_COUNT) {
    return { error: "추가로 반영할 수 있는 사진이 없어요.", storagePath: null };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const normalizedImage = await normalizeAiFaceImage(inputBuffer).catch(() => {
    return null;
  });

  if (!normalizedImage) {
    return {
      error: "사진을 AI 생성용 JPEG로 변환하지 못했습니다. 다른 사진을 선택해 주세요.",
      storagePath: null,
    };
  }

  const storagePath = createFaceImageStoragePath({
    fileName: file.name,
    userId: user.id,
  });
  const { error: uploadError } = await supabase.storage
    .from(FACE_IMAGE_BUCKET)
    .upload(storagePath, normalizedImage.buffer, {
      cacheControl: "31536000",
      contentType: normalizedImage.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: "사진을 업로드하지 못했어요. 다시 시도해 주세요.",
      storagePath: null,
    };
  }

  const payload: TablesInsert<"profile_face_images"> = {
    storage_path: storagePath,
    user_id: user.id,
  };
  const { error: recordError } = await supabase
    .from("profile_face_images")
    .insert(payload);

  if (recordError) {
    await supabase.storage.from(FACE_IMAGE_BUCKET).remove([storagePath]);

    return {
      error: "사진 정보를 저장하지 못했습니다. 다시 시도해 주세요.",
      storagePath: null,
    };
  }

  return { error: null, storagePath };
}
