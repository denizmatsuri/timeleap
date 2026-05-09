import "server-only";

import { request as createHttpsRequest } from "node:https";

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_GEMINI_IMAGE_SIZE = "1K";
const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3-flash-preview";
const DEFAULT_GEMINI_TEXT_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;
const GEMINI_REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
const GEMINI_TRANSIENT_RETRY_DELAYS_MS = [1500, 3500];

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
};

type GeminiPart = {
  inlineData?: GeminiInlineData;
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiHttpResponse = {
  body: string;
  status: number;
};

type GeminiErrorDetails = {
  fallbackable: boolean;
  message: string;
  retryable: boolean;
};

export type ReferenceImageInput = {
  base64Data: string;
  mimeType: string;
};

type GenerateContentPayload = {
  contents: Array<{
    parts: Array<
      | {
          text: string;
        }
      | {
          inlineData: {
            data: string;
            mimeType: string;
          };
        }
    >;
    role: "user";
  }>;
  generationConfig?: Record<string, unknown>;
};

class GeminiRequestError extends Error {
  fallbackable: boolean;
  model: string;
  retryable: boolean;

  constructor({
    fallbackable,
    message,
    model,
    retryable,
  }: GeminiErrorDetails & {
    model: string;
  }) {
    super(message);
    this.name = "GeminiRequestError";
    this.fallbackable = fallbackable;
    this.model = model;
    this.retryable = retryable;
  }
}

function isGeminiRequestError(error: unknown): error is GeminiRequestError {
  return error instanceof GeminiRequestError;
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 필요합니다.");
  }

  return apiKey;
}

function getGeminiImageModel(modelOverride?: string) {
  const model = modelOverride ?? DEFAULT_GEMINI_IMAGE_MODEL;

  if (!model.toLowerCase().includes("image")) {
    throw new Error(
      `Gemini 이미지 모델은 image 모델이어야 합니다. 현재 값: ${model}`,
    );
  }

  return model;
}

function getGeminiImageSize(imageSizeOverride?: string) {
  return imageSizeOverride ?? DEFAULT_GEMINI_IMAGE_SIZE;
}

function getUniqueModels(models: readonly string[]) {
  return Array.from(new Set(models));
}

function getGeminiTextModels({
  fallbackModels,
  model,
}: {
  fallbackModels?: readonly string[];
  model?: string;
}) {
  return getUniqueModels([
    model ?? DEFAULT_GEMINI_TEXT_MODEL,
    ...(fallbackModels ?? DEFAULT_GEMINI_TEXT_FALLBACK_MODELS),
  ]);
}

function createGeminiErrorDetails({
  fallbackMessage,
  model,
  responseStatus,
}: {
  fallbackMessage: string;
  model: string;
  responseStatus: number;
}) {
  const normalizedMessage = fallbackMessage.toLowerCase();
  const isQuotaError =
    responseStatus === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate limit");
  const isTransientCapacityError =
    responseStatus === 500 ||
    responseStatus === 503 ||
    responseStatus === 504 ||
    normalizedMessage.includes("high demand") ||
    normalizedMessage.includes("overloaded") ||
    normalizedMessage.includes("try again later");

  if (isQuotaError) {
    return {
      fallbackable: true,
      message: `Gemini 모델 사용량 한도를 초과했습니다. Google AI Studio에서 프로젝트 billing/quota를 확인하거나 사용 가능한 모델 프리셋을 선택해 주세요. 현재 실패 모델: ${model}`,
      retryable: false,
    };
  }

  if (isTransientCapacityError) {
    return {
      fallbackable: true,
      message: `Gemini 모델 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요. 현재 실패 모델: ${model}`,
      retryable: true,
    };
  }

  return {
    fallbackable: false,
    message: fallbackMessage || "Gemini 요청에 실패했습니다.",
    retryable: false,
  };
}

function createGeminiNetworkError({
  error,
  model,
}: {
  error: unknown;
  model: string;
}) {
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? ` ${error.cause.message}`
      : "";
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "network error";

  return new GeminiRequestError({
    fallbackable: true,
    message: `Gemini 응답 수신에 실패했습니다. 모델 ${model} 요청이 너무 오래 걸렸거나 네트워크 연결이 끊겼습니다. 원인: ${message}${cause}`,
    model,
    retryable: false,
  });
}

function createGeminiRequestUrl({ model }: { model: string }) {
  return new URL(`${GEMINI_API_BASE_URL}/${model}:generateContent`);
}

function parseJsonResponse<T>(body: string) {
  if (!body.trim()) {
    return undefined;
  }

  return JSON.parse(body) as T;
}

async function postGeminiJson({
  model,
  payload,
}: {
  model: string;
  payload: GenerateContentPayload;
}) {
  const url = createGeminiRequestUrl({ model });
  const body = JSON.stringify(payload);

  return new Promise<GeminiHttpResponse>((resolve, reject) => {
    const clientRequest = createHttpsRequest(
      url,
      {
        headers: {
          "Content-Length": Buffer.byteLength(body),
          "Content-Type": "application/json",
          "x-goog-api-key": getGeminiApiKey(),
        },
        method: "POST",
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            status: response.statusCode ?? 0,
          });
        });
      },
    );

    clientRequest.setTimeout(GEMINI_REQUEST_TIMEOUT_MS, () => {
      clientRequest.destroy(
        new Error(
          `Gemini 요청 제한 시간 ${GEMINI_REQUEST_TIMEOUT_MS / 1000}초를 초과했습니다.`,
        ),
      );
    });
    clientRequest.on("error", reject);
    clientRequest.write(body);
    clientRequest.end();
  });
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function collectResponseParts(response: GeminiGenerateContentResponse) {
  const parts =
    response.candidates?.flatMap(
      (candidate) => candidate.content?.parts ?? [],
    ) ?? [];

  return parts;
}

function extractTextFromResponse(response: GeminiGenerateContentResponse) {
  return collectResponseParts(response)
    .map((part) => part.text?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n")
    .trim();
}

function extractFirstImageFromResponse(
  response: GeminiGenerateContentResponse,
) {
  return collectResponseParts(response).find(
    (part) => part.inlineData?.data && part.inlineData.mimeType,
  );
}

function stripMarkdownCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function generateContent({
  model,
  payload,
}: {
  model: string;
  payload: GenerateContentPayload;
}) {
  for (
    let attemptIndex = 0;
    attemptIndex <= GEMINI_TRANSIENT_RETRY_DELAYS_MS.length;
    attemptIndex += 1
  ) {
    try {
      const response = await postGeminiJson({
        model,
        payload,
      });

      const data = parseJsonResponse<GeminiGenerateContentResponse>(
        response.body,
      );

      if (response.status >= 200 && response.status < 300) {
        return data ?? {};
      }

      const errorDetails = createGeminiErrorDetails({
        fallbackMessage: data?.error?.message ?? "Gemini 요청에 실패했습니다.",
        model,
        responseStatus: response.status,
      });
      const retryDelay = GEMINI_TRANSIENT_RETRY_DELAYS_MS[attemptIndex];

      if (errorDetails.retryable && retryDelay) {
        await wait(retryDelay);
        continue;
      }

      throw new GeminiRequestError({
        ...errorDetails,
        model,
      });
    } catch (error) {
      if (isGeminiRequestError(error)) {
        throw error;
      }

      throw createGeminiNetworkError({ error, model });
    }
  }

  throw new Error("Gemini 요청에 실패했습니다.");
}

function parseDiaryTextResponse(rawText: string) {
  const normalizedText = stripMarkdownCodeFence(rawText);
  const parsedResponse = JSON.parse(normalizedText) as Partial<{
    body: unknown;
    title: unknown;
  }>;
  const title =
    typeof parsedResponse.title === "string" ? parsedResponse.title.trim() : "";
  const body =
    typeof parsedResponse.body === "string" ? parsedResponse.body.trim() : "";

  if (!title || !body) {
    throw new Error("Gemini 텍스트 응답에 title 또는 body가 없습니다.");
  }

  return {
    body,
    title,
  };
}

export async function generateDiaryHeroImage({
  imageSize,
  model,
  prompt,
  referenceImages,
}: {
  imageSize?: string;
  model?: string;
  prompt: string;
  referenceImages: ReferenceImageInput[];
}) {
  const resolvedModel = getGeminiImageModel(model);
  const resolvedImageSize = getGeminiImageSize(imageSize);
  const response = await generateContent({
    model: resolvedModel,
    payload: {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...referenceImages.map((referenceImage) => ({
              inlineData: {
                data: referenceImage.base64Data,
                mimeType: referenceImage.mimeType,
              },
            })),
          ],
        },
      ],
      generationConfig: {
        imageConfig: {
          aspectRatio: "4:5",
          imageSize: resolvedImageSize,
        },
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
  });
  const imagePart = extractFirstImageFromResponse(response);

  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    throw new Error("Gemini 이미지 응답에서 결과 이미지를 찾지 못했습니다.");
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    imageModel: resolvedModel,
    imageProvider: "google" as const,
    imageQuality: resolvedImageSize,
    imageSize: resolvedImageSize,
    mimeType: imagePart.inlineData.mimeType,
  };
}

export async function generateDiaryText({
  fallbackModels,
  model,
  prompt,
}: {
  fallbackModels?: readonly string[];
  model?: string;
  prompt: string;
}) {
  const textModels = getGeminiTextModels({
    fallbackModels,
    model,
  });
  let lastError: unknown = null;

  for (const [modelIndex, model] of textModels.entries()) {
    try {
      const response = await generateContent({
        model,
        payload: {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: {
              additionalProperties: false,
              properties: {
                body: {
                  description: "2~4문장의 한국어 짧은 여행 일기 본문",
                  type: "string",
                },
                title: {
                  description: "12자 이내의 한국어 짧은 제목",
                  type: "string",
                },
              },
              required: ["title", "body"],
              type: "object",
            },
            temperature: 1,
          },
        },
      });
      const rawText = extractTextFromResponse(response);

      if (!rawText) {
        throw new Error("Gemini 텍스트 응답이 비어 있습니다.");
      }

      return {
        ...parseDiaryTextResponse(rawText),
        textModel: model,
        textProvider: "google" as const,
      };
    } catch (error) {
      lastError = error;

      if (
        isGeminiRequestError(error) &&
        error.fallbackable &&
        modelIndex < textModels.length - 1
      ) {
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini 텍스트 생성에 실패했습니다.");
}
