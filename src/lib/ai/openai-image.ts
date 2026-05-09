import "server-only";

import type { ReferenceImageInput } from "@/lib/ai/gemini";

const OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";
const OPENAI_IMAGE_EDIT_MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const OPENAI_SUPPORTED_REFERENCE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
  }

  return apiKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringProperty(record: Record<string, unknown>, property: string) {
  const value = record[property];

  return typeof value === "string" ? value : null;
}

function readOpenAiErrorMessage(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const error = value.error;

  if (!isRecord(error)) {
    return null;
  }

  return getStringProperty(error, "message");
}

function readFirstBase64Image(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    return null;
  }

  const firstImage = value.data[0];

  if (!isRecord(firstImage)) {
    return null;
  }

  return getStringProperty(firstImage, "b64_json");
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

export async function generateDiaryHeroImageWithOpenAI({
  model,
  prompt,
  quality,
  referenceImages,
  size,
}: {
  model: string;
  prompt: string;
  quality: string;
  referenceImages: ReferenceImageInput[];
  size: string;
}) {
  const formData = new FormData();

  formData.append("model", model);
  formData.append("prompt", prompt);
  formData.append("quality", quality);
  formData.append("size", size);
  formData.append("n", "1");

  for (const [index, referenceImage] of referenceImages.entries()) {
    if (
      !OPENAI_SUPPORTED_REFERENCE_IMAGE_MIME_TYPES.has(referenceImage.mimeType)
    ) {
      throw new Error(
        `GPT 참조 이미지 ${index + 1}번은 AI용 JPG/PNG/WebP가 아닙니다. 얼굴 사진을 다시 업로드해 주세요.`,
      );
    }

    const buffer = Buffer.from(referenceImage.base64Data, "base64");

    if (buffer.length === 0) {
      throw new Error(
        `GPT 참조 이미지 ${index + 1}번 파일이 비어 있습니다. 얼굴 사진을 다시 업로드해 주세요.`,
      );
    }

    if (buffer.length > OPENAI_IMAGE_EDIT_MAX_IMAGE_BYTES) {
      throw new Error(
        `GPT 참조 이미지 ${index + 1}번의 용량이 OpenAI 제한을 초과했습니다.`,
      );
    }

    const blob = new Blob([new Uint8Array(buffer)], {
      type: referenceImage.mimeType,
    });
    const extension = inferExtensionFromMimeType(referenceImage.mimeType);

    formData.append("image[]", blob, `reference-${index + 1}.${extension}`);
  }

  const response = await fetch(OPENAI_IMAGE_EDIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
    },
    body: formData,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(
      readOpenAiErrorMessage(data) ?? "OpenAI 이미지 생성에 실패했습니다.",
    );
  }

  const base64Image = readFirstBase64Image(data);

  if (!base64Image) {
    throw new Error("OpenAI 이미지 응답에서 결과 이미지를 찾지 못했습니다.");
  }

  return {
    buffer: Buffer.from(base64Image, "base64"),
    imageModel: model,
    imageProvider: "openai" as const,
    imageQuality: quality,
    imageSize: size,
    mimeType: "image/png",
  };
}
