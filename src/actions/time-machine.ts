"use server";

import {
  createDiary,
  getDiaryByGenerationRequestId,
} from "@/lib/diaries/server";
import {
  generateDiaryHeroImage,
  generateDiaryText,
  type ReferenceImageInput,
} from "@/lib/ai/gemini";
import { buildGenerateImagePrompt } from "@/lib/prompts/diary/generate-image-prompt";
import { buildGenerateTextPrompt } from "@/lib/prompts/diary/generate-text-prompt";
import { createClient } from "@/lib/supabase/server";
import { resolveDestinationSelection } from "@/lib/time-machine/destination";

const DIARY_IMAGE_BUCKET = "diary-images";
const FACE_IMAGE_BUCKET = "face-images";
const MAX_REFERENCE_IMAGES = 3;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GenerateDiaryFromSelectionInput = {
  countryCode: string;
  eraId: string;
  generationRequestId: string;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "AI 생성 중 오류가 발생했습니다.";
}

function inferMimeTypeFromPath(storagePath: string) {
  const extension = storagePath.split(".").at(-1)?.toLowerCase();

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function inferExtensionFromMimeType(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function buildFallbackDiaryTitle(sceneTitle: string) {
  return sceneTitle.slice(0, 12).trim() || "시간 여행";
}

async function readReferenceImages({
  supabase,
  storagePaths,
  userId,
}: {
  supabase: SupabaseServerClient;
  storagePaths: string[];
  userId: string;
}) {
  const uniquePaths = Array.from(new Set(storagePaths)).slice(
    0,
    MAX_REFERENCE_IMAGES,
  );

  if (uniquePaths.length === 0) {
    throw new Error("생성에 필요한 얼굴 사진이 없습니다.");
  }

  const referenceImages = await Promise.all(
    uniquePaths.map(async (storagePath): Promise<ReferenceImageInput> => {
      const { data, error } = await supabase.storage
        .from(FACE_IMAGE_BUCKET)
        .download(storagePath);

      if (error || !data) {
        throw new Error(
          `참조 사진을 읽지 못했습니다.${error ? ` ${error.message}` : ""}`,
        );
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const mimeType = data.type || inferMimeTypeFromPath(storagePath);

      return {
        base64Data: buffer.toString("base64"),
        mimeType,
      };
    }),
  );

  if (referenceImages.length === 0) {
    throw new Error(`${userId} 사용자의 참조 사진을 불러오지 못했습니다.`);
  }

  return referenceImages;
}

async function uploadGeneratedHeroImage({
  supabase,
  buffer,
  mimeType,
  userId,
  eraId,
}: {
  supabase: SupabaseServerClient;
  buffer: Buffer;
  mimeType: string;
  userId: string;
  eraId: string;
}) {
  const extension = inferExtensionFromMimeType(mimeType);
  const storagePath = `${userId}/${crypto.randomUUID()}-${eraId}.${extension}`;
  const { error } = await supabase.storage
    .from(DIARY_IMAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`대표 이미지 업로드에 실패했습니다. ${error.message}`);
  }

  return storagePath;
}

export async function generateDiaryFromSelection({
  countryCode,
  eraId,
  generationRequestId,
}: GenerateDiaryFromSelectionInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const existingDiary = await getDiaryByGenerationRequestId({
    generationRequestId,
    supabase,
    userId: user.id,
  });

  if (existingDiary) {
    return {
      diaryId: existingDiary.id,
    };
  }

  const { country, era } = resolveDestinationSelection({
    countryCode,
    eraId,
  });
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, age_range, gender")
    .eq("id", user.id)
    .maybeSingle();
  const { data: faceImages, error: faceImagesError } = await supabase
    .from("profile_face_images")
    .select("storage_path")
    .eq("user_id", user.id)
    .limit(MAX_REFERENCE_IMAGES);

  if (profileError) {
    throw new Error(`프로필을 읽지 못했습니다. ${profileError.message}`);
  }

  if (faceImagesError) {
    throw new Error(`얼굴 사진을 읽지 못했습니다. ${faceImagesError.message}`);
  }

  const referenceImagePaths = faceImages.map((image) => image.storage_path);
  const referenceImages = await readReferenceImages({
    supabase,
    storagePaths: referenceImagePaths,
    userId: user.id,
  });
  const heroScene = era.sceneCards[0];
  const imagePrompt = buildGenerateImagePrompt({
    ageRange: profile?.age_range,
    city: era.city,
    countryEnglishName: country.englishName,
    countryName: country.name,
    eraHeadline: era.headline,
    eraTitle: era.title,
    eraYear: era.year,
    gender: profile?.gender,
    mood: era.mood,
    motifs: era.motifs,
    referenceImageCount: referenceImages.length,
    sceneNote: heroScene.note,
    sceneTitle: heroScene.title,
    soundtrack: era.soundtrack,
    texture: era.texture,
    wardrobe: era.wardrobe,
  });
  const textPrompt = buildGenerateTextPrompt({
    ageRange: profile?.age_range,
    city: era.city,
    countryName: country.name,
    displayName: profile?.display_name ?? user.email ?? null,
    eraTitle: era.title,
    eraYear: era.year,
    gender: profile?.gender,
    mood: era.mood,
    sceneNote: heroScene.note,
    sceneTitle: heroScene.title,
    texture: era.texture,
    wardrobe: era.wardrobe,
  });

  try {
    const generatedText = await generateDiaryText({
      prompt: textPrompt,
    });
    const generatedImage = await generateDiaryHeroImage({
      prompt: imagePrompt,
      referenceImages,
    });
    const heroImagePath = await uploadGeneratedHeroImage({
      supabase,
      buffer: generatedImage.buffer,
      eraId: era.id,
      mimeType: generatedImage.mimeType,
      userId: user.id,
    });
    const savedDiary = await createDiary(supabase, {
      body: generatedText.body,
      countryCode: country.code,
      eraId: era.id,
      generationRequestId,
      heroImagePath,
      title: generatedText.title || buildFallbackDiaryTitle(heroScene.title),
      userId: user.id,
    });

    return {
      diaryId: savedDiary.id,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
