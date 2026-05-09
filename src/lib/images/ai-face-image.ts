import "server-only";

import sharp from "sharp";

export const AI_FACE_IMAGE_INPUT_MAX_BYTES = 10 * 1024 * 1024;
export const AI_FACE_IMAGE_MAX_DIMENSION = 1536;
export const AI_FACE_IMAGE_MIN_DIMENSION = 512;
export const AI_FACE_IMAGE_MIME_TYPE = "image/jpeg";
export const AI_FACE_IMAGE_EXTENSION = "jpg";
export const AI_FACE_IMAGE_TARGET_QUALITY = 86;
export const AI_FACE_IMAGE_TARGET_MAX_BYTES = 3 * 1024 * 1024;

type NormalizedAiFaceImage = {
  buffer: Buffer;
  byteSize: number;
  extension: typeof AI_FACE_IMAGE_EXTENSION;
  height: number;
  mimeType: typeof AI_FACE_IMAGE_MIME_TYPE;
  sourceHeight: number;
  sourceWidth: number;
  width: number;
};

async function encodeAiFaceImage({
  buffer,
  maxDimension,
  quality,
}: {
  buffer: Buffer;
  maxDimension: number;
  quality: number;
}) {
  return sharp(buffer, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({
      fit: "inside",
      height: maxDimension,
      withoutEnlargement: true,
      width: maxDimension,
    })
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .jpeg({
      mozjpeg: true,
      progressive: false,
      quality,
    })
    .toBuffer({ resolveWithObject: true });
}

export async function normalizeAiFaceImage(
  buffer: Buffer,
): Promise<NormalizedAiFaceImage> {
  if (buffer.length === 0) {
    throw new Error("이미지 파일이 비어 있습니다.");
  }

  if (buffer.length > AI_FACE_IMAGE_INPUT_MAX_BYTES) {
    throw new Error("이미지는 10MB 이하로 올려 주세요.");
  }

  const metadata = await sharp(buffer, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  }).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;

  if (
    sourceWidth < AI_FACE_IMAGE_MIN_DIMENSION ||
    sourceHeight < AI_FACE_IMAGE_MIN_DIMENSION
  ) {
    throw new Error("최소 512px 이상의 선명한 사진이 필요해요.");
  }

  const attempts = [
    { maxDimension: AI_FACE_IMAGE_MAX_DIMENSION, quality: AI_FACE_IMAGE_TARGET_QUALITY },
    { maxDimension: AI_FACE_IMAGE_MAX_DIMENSION, quality: 80 },
    { maxDimension: 1280, quality: 78 },
  ] as const;
  let normalized = await encodeAiFaceImage({
    buffer,
    maxDimension: attempts[0].maxDimension,
    quality: attempts[0].quality,
  });

  for (const attempt of attempts.slice(1)) {
    if (normalized.data.length <= AI_FACE_IMAGE_TARGET_MAX_BYTES) {
      break;
    }

    normalized = await encodeAiFaceImage({
      buffer,
      maxDimension: attempt.maxDimension,
      quality: attempt.quality,
    });
  }

  const width = normalized.info.width;
  const height = normalized.info.height;

  if (
    width < AI_FACE_IMAGE_MIN_DIMENSION ||
    height < AI_FACE_IMAGE_MIN_DIMENSION
  ) {
    throw new Error("AI 생성에 사용할 수 있는 얼굴 사진 크기가 부족합니다.");
  }

  return {
    buffer: normalized.data,
    byteSize: normalized.data.length,
    extension: AI_FACE_IMAGE_EXTENSION,
    height,
    mimeType: AI_FACE_IMAGE_MIME_TYPE,
    sourceHeight,
    sourceWidth,
    width,
  };
}
