import "server-only";

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_GEMINI_IMAGE_SIZE = "1K";
const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_TEXT_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;
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

function getGeminiImageModel() {
  const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_GEMINI_IMAGE_MODEL;

  if (!model.toLowerCase().includes("image")) {
    throw new Error(
      `GEMINI_IMAGE_MODEL은 이미지 생성 모델이어야 합니다. 현재 값: ${model}`,
    );
  }

  return model;
}

function getGeminiImageSize() {
  return process.env.GEMINI_IMAGE_SIZE ?? DEFAULT_GEMINI_IMAGE_SIZE;
}

function getGeminiTextModel() {
  return process.env.GEMINI_TEXT_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL;
}

function parseModelList(value: string | undefined) {
  return value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function getUniqueModels(models: readonly string[]) {
  return Array.from(new Set(models));
}

function getGeminiTextModels() {
  return getUniqueModels([
    getGeminiTextModel(),
    ...(parseModelList(process.env.GEMINI_TEXT_FALLBACK_MODELS) ??
      DEFAULT_GEMINI_TEXT_FALLBACK_MODELS),
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
      message: `Gemini 모델 사용량 한도를 초과했습니다. Google AI Studio에서 프로젝트 billing/quota를 확인하거나 GEMINI_IMAGE_MODEL, GEMINI_TEXT_MODEL 환경변수로 사용 가능한 모델을 지정해 주세요. 현재 실패 모델: ${model}`,
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
    const response = await fetch(
      `${GEMINI_API_BASE_URL}/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": getGeminiApiKey(),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const data = (await response.json()) as
      | GeminiGenerateContentResponse
      | undefined;

    if (response.ok) {
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
  prompt,
  referenceImages,
}: {
  prompt: string;
  referenceImages: ReferenceImageInput[];
}) {
  const response = await generateContent({
    model: getGeminiImageModel(),
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
          imageSize: getGeminiImageSize(),
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
    mimeType: imagePart.inlineData.mimeType,
  };
}

export async function generateDiaryText({ prompt }: { prompt: string }) {
  const textModels = getGeminiTextModels();
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

      return parseDiaryTextResponse(rawText);
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
