"use server";

import {
  createDiary,
  getDiaryByGenerationRequestId,
} from "@/lib/diaries/server";
import {
  createOrGetGenerationJob,
  getGenerationJobById,
  hasGenerationJobLeaseExpired,
  isGenerationJobFailed,
  isGenerationJobRunning,
  isGenerationJobSucceeded,
  markGenerationJobFailed,
  markGenerationJobSucceeded,
  type GenerationJobRecord,
} from "@/lib/time-machine/generation-job";
import {
  generateDiaryHeroImage,
  generateDiaryText,
  type ReferenceImageInput,
} from "@/lib/ai/gemini";
import { generateDiaryHeroImageWithOpenAI } from "@/lib/ai/openai-image";
import {
  buildDiaryGenerationModelMetadata,
  resolveDiaryGenerationModel,
} from "@/lib/ai/generation-models";
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
  generationModelId?: string | null;
};
export type DiaryGenerationStatus =
  | { status: "failed"; message: string }
  | { status: "running" }
  | { diaryId: string; status: "succeeded" };

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

async function resolveGenerationJobStatus({
  generationRequestId,
  job,
  supabase,
  userId,
}: {
  generationRequestId: string;
  job: GenerationJobRecord;
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<DiaryGenerationStatus> {
  if (isGenerationJobSucceeded(job)) {
    if (job.diary_id) {
      return {
        diaryId: job.diary_id,
        status: "succeeded",
      };
    }

    const existingDiary = await getDiaryByGenerationRequestId({
      generationRequestId,
      supabase,
      userId,
    });

    if (existingDiary) {
      return {
        diaryId: existingDiary.id,
        status: "succeeded",
      };
    }

    return {
      message: "완료된 생성 작업의 여행기를 찾을 수 없습니다.",
      status: "failed",
    };
  }

  if (isGenerationJobFailed(job)) {
    return {
      message: job.error_message ?? "여행기 생성에 실패했습니다.",
      status: "failed",
    };
  }

  if (hasGenerationJobLeaseExpired(job)) {
    const failedJob = await markGenerationJobFailed({
      errorMessage: "생성 시간이 초과되었습니다. 다시 출발해 주세요.",
      generationRequestId,
      supabase,
      userId,
    });

    return {
      message: failedJob.error_message ?? "생성 시간이 초과되었습니다.",
      status: "failed",
    };
  }

  if (isGenerationJobRunning(job)) {
    return {
      status: "running",
    };
  }

  return {
    message: "알 수 없는 생성 작업 상태입니다.",
    status: "failed",
  };
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
  generationModelId,
}: GenerateDiaryFromSelectionInput): Promise<DiaryGenerationStatus> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { country, era } = resolveDestinationSelection({
    countryCode,
    eraId,
  });
  const generationModel = resolveDiaryGenerationModel(generationModelId);
  const initialModelMetadata = buildDiaryGenerationModelMetadata({
    generationModel,
  });
  const existingDiary = await getDiaryByGenerationRequestId({
    generationRequestId,
    supabase,
    userId: user.id,
  });

  if (existingDiary) {
    return {
      diaryId: existingDiary.id,
      status: "succeeded",
    };
  }

  const jobClaim = await createOrGetGenerationJob({
    countryCode: country.code,
    eraId: era.id,
    generationRequestId,
    metadata: initialModelMetadata,
    supabase,
    userId: user.id,
  });

  if (jobClaim.kind === "existing") {
    return resolveGenerationJobStatus({
      generationRequestId,
      job: jobClaim.job,
      supabase,
      userId: user.id,
    });
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, age_range, gender")
      .eq("id", user.id)
      .maybeSingle();
    const { data: faceImages, error: faceImagesError } = await supabase
      .from("profile_face_images")
      .select("storage_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(MAX_REFERENCE_IMAGES);

    if (profileError) {
      throw new Error(`프로필을 읽지 못했습니다. ${profileError.message}`);
    }

    if (faceImagesError) {
      throw new Error(
        `얼굴 사진을 읽지 못했습니다. ${faceImagesError.message}`,
      );
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
    const generatedText = await generateDiaryText({
      fallbackModels: generationModel.text.fallbackModels,
      model: generationModel.text.model,
      prompt: textPrompt,
    });
    const generatedImage =
      generationModel.image.provider === "openai"
        ? await generateDiaryHeroImageWithOpenAI({
            model: generationModel.image.model,
            prompt: imagePrompt,
            quality: generationModel.image.quality,
            referenceImages,
            size: generationModel.image.size,
          })
        : await generateDiaryHeroImage({
            imageSize: generationModel.image.size,
            model: generationModel.image.model,
            prompt: imagePrompt,
            referenceImages,
          });
    const finalModelMetadata = buildDiaryGenerationModelMetadata({
      generationModel,
      textModel: generatedText.textModel,
      textProvider: generatedText.textProvider,
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
      metadata: finalModelMetadata,
      title: generatedText.title || buildFallbackDiaryTitle(heroScene.title),
      userId: user.id,
    });

    try {
      await markGenerationJobSucceeded({
        diaryId: savedDiary.id,
        generationRequestId,
        metadata: finalModelMetadata,
        supabase,
        userId: user.id,
      });
    } catch {
      // Diary 저장은 이미 완료됐으므로 작업 상태 기록 실패가 사용자 결과를 뒤집지 않는다.
    }

    return {
      diaryId: savedDiary.id,
      status: "succeeded",
    };
  } catch (error) {
    const message = toErrorMessage(error);

    try {
      await markGenerationJobFailed({
        errorMessage: message,
        generationRequestId,
        supabase,
        userId: user.id,
      });
    } catch {
      // The original generation failure is the actionable error for the user.
    }

    throw new Error(message);
  }
}

export async function getDiaryGenerationStatus({
  generationRequestId,
}: {
  generationRequestId: string;
}): Promise<DiaryGenerationStatus> {
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
      status: "succeeded",
    };
  }

  const job = await getGenerationJobById({
    generationRequestId,
    supabase,
    userId: user.id,
  });

  if (!job) {
    return {
      message: "생성 작업을 찾을 수 없습니다.",
      status: "failed",
    };
  }

  return resolveGenerationJobStatus({
    generationRequestId,
    job,
    supabase,
    userId: user.id,
  });
}
