export type ImageGenerationProvider = "google" | "openai";
export type TextGenerationProvider = "google" | "openai";
export type DiaryGenerationModelId = "gemini-flash" | "gpt" | "gemini";

type DiaryImageGenerationModel = {
  model: string;
  provider: ImageGenerationProvider;
  quality: string;
  size: string;
};

type DiaryTextGenerationModel = {
  fallbackModels: readonly string[];
  model: string;
  provider: TextGenerationProvider;
};

export type DiaryGenerationModel = {
  durationLabel: string;
  id: DiaryGenerationModelId;
  image: DiaryImageGenerationModel;
  label: string;
  note: string;
  shortLabel: string;
  text: DiaryTextGenerationModel;
};

export type DiaryGenerationModelMetadata = {
  imageModel: string;
  imageProvider: ImageGenerationProvider;
  imageQuality: string;
  imageSize: string;
  textModel: string;
  textProvider: TextGenerationProvider;
};

const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3-flash-preview";
const DEFAULT_GEMINI_TEXT_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

export const DEFAULT_DIARY_GENERATION_MODEL_ID: DiaryGenerationModelId =
  "gemini-flash";

export const DIARY_GENERATION_MODELS = [
  {
    durationLabel: "30-60초",
    id: "gemini-flash",
    image: {
      model: "gemini-3.1-flash-image-preview",
      provider: "google",
      quality: "1K",
      size: "1K",
    },
    label: "GEMINI-FLASH",
    note: "빠른 기본 촬영",
    shortLabel: "FLASH",
    text: {
      fallbackModels: DEFAULT_GEMINI_TEXT_FALLBACK_MODELS,
      model: DEFAULT_GEMINI_TEXT_MODEL,
      provider: "google",
    },
  },
  {
    durationLabel: "3-6분",
    id: "gemini",
    image: {
      model: "gemini-3-pro-image-preview",
      provider: "google",
      quality: "1K",
      size: "1K",
    },
    label: "GEMINI",
    note: "고품질 실험 촬영",
    shortLabel: "GEMINI",
    text: {
      fallbackModels: DEFAULT_GEMINI_TEXT_FALLBACK_MODELS,
      model: DEFAULT_GEMINI_TEXT_MODEL,
      provider: "google",
    },
  },
  {
    durationLabel: "45-90초",
    id: "gpt",
    image: {
      model: "gpt-image-2",
      provider: "openai",
      quality: "medium",
      size: "1024x1280",
    },
    label: "GPT",
    note: "실사 질감 우선",
    shortLabel: "GPT",
    text: {
      fallbackModels: DEFAULT_GEMINI_TEXT_FALLBACK_MODELS,
      model: DEFAULT_GEMINI_TEXT_MODEL,
      provider: "google",
    },
  },
] as const satisfies readonly DiaryGenerationModel[];

export function resolveDiaryGenerationModel(value: string | null | undefined) {
  return (
    DIARY_GENERATION_MODELS.find((generationModel) => {
      return generationModel.id === value;
    }) ??
    DIARY_GENERATION_MODELS.find((generationModel) => {
      return generationModel.id === DEFAULT_DIARY_GENERATION_MODEL_ID;
    }) ??
    DIARY_GENERATION_MODELS[0]
  );
}

export function buildDiaryGenerationModelMetadata({
  generationModel,
  textModel = generationModel.text.model,
  textProvider = generationModel.text.provider,
}: {
  generationModel: DiaryGenerationModel;
  textModel?: string;
  textProvider?: TextGenerationProvider;
}): DiaryGenerationModelMetadata {
  return {
    imageModel: generationModel.image.model,
    imageProvider: generationModel.image.provider,
    imageQuality: generationModel.image.quality,
    imageSize: generationModel.image.size,
    textModel,
    textProvider,
  };
}
