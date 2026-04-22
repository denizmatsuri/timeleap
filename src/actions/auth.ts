'use server';

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AGE_RANGE_OPTIONS,
  type AgeRangeOptionValue,
  GENDER_OPTIONS,
  type GenderOptionValue,
} from "@/lib/auth/profile-options";
import {
  createLoginRedirectPath,
  normalizeNextPath,
} from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

type OnboardingFieldErrors = {
  ageRange?: string;
  displayName?: string;
  gender?: string;
  photos?: string;
};

type OnboardingProfileFieldErrors = Pick<
  OnboardingFieldErrors,
  "ageRange" | "displayName" | "gender"
>;

export type OnboardingFormState = {
  error?: string;
  fieldErrors?: OnboardingFieldErrors;
};

export type OnboardingDraftResult = {
  error?: string;
  fieldErrors?: OnboardingProfileFieldErrors;
};

type OnboardingProfileInput = {
  ageRange: string;
  displayName: string;
  gender: string;
};

type OnboardingProfileValues = {
  ageRange: AgeRangeOptionValue;
  displayName: string;
  gender: GenderOptionValue;
};

type OnboardingProfileValidationResult =
  | {
      fieldErrors: OnboardingProfileFieldErrors;
      values: null;
    }
  | {
      fieldErrors: null;
      values: OnboardingProfileValues;
    };

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const MIN_FACE_IMAGE_COUNT = 1;
const MAX_FACE_IMAGE_COUNT = 10;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOnboardingProfile(formData: FormData): OnboardingProfileInput {
  return {
    ageRange: readText(formData, "ageRange"),
    displayName: readText(formData, "displayName"),
    gender: readText(formData, "gender"),
  };
}

function normalizeDisplayName(value: string) {
  if (value.length === 0) {
    return { error: "이름은 꼭 입력해 주세요.", value: "" };
  }

  if (value.length > 40) {
    return { error: "이름은 40자 이하로 입력해 주세요.", value };
  }

  return { value };
}

function normalizeGender(value: string) {
  if (value.length === 0) {
    return { error: "성별을 선택해 주세요.", value: null };
  }

  const isValid = GENDER_OPTIONS.some((option) => option.value === value);

  if (!isValid) {
    return { error: "성별 값을 다시 확인해 주세요.", value };
  }

  return { value: value as GenderOptionValue };
}

function normalizeAgeRange(value: string) {
  if (value.length === 0) {
    return { error: "연령대를 선택해 주세요.", value: null };
  }

  const isValid = AGE_RANGE_OPTIONS.some((option) => option.value === value);

  if (!isValid) {
    return { error: "연령대 값을 다시 확인해 주세요.", value };
  }

  return { value: value as AgeRangeOptionValue };
}

function validateOnboardingProfile(
  input: OnboardingProfileInput,
): OnboardingProfileValidationResult {
  const displayName = normalizeDisplayName(input.displayName.trim());
  const gender = normalizeGender(input.gender.trim());
  const ageRange = normalizeAgeRange(input.ageRange.trim());
  const fieldErrors: OnboardingProfileFieldErrors = {
    ageRange: ageRange.error,
    displayName: displayName.error,
    gender: gender.error,
  };

  if (Object.values(fieldErrors).some(Boolean)) {
    return { fieldErrors, values: null };
  }

  return {
    fieldErrors: null,
    values: {
      ageRange: ageRange.value as AgeRangeOptionValue,
      displayName: displayName.value,
      gender: gender.value as GenderOptionValue,
    },
  };
}

async function saveOnboardingProfile(
  supabase: ServerSupabaseClient,
  userId: string,
  profile: OnboardingProfileValues,
) {
  const payload: TablesInsert<"profiles"> = {
    id: userId,
    age_range: profile.ageRange,
    display_name: profile.displayName,
    gender: profile.gender,
  };

  return supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(createLoginRedirectPath("/onboarding"));
  }

  return { supabase, user };
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return trimTrailingSlash(origin);
  }

  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  }

  return "http://localhost:3000";
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const nextPath = normalizeNextPath(formData.get("next"));
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error) {
    redirect(
      `/login?error=auth_failed&next=${encodeURIComponent(nextPath)}`,
    );
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect(`/login?error=auth_failed&next=${encodeURIComponent(nextPath)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const { supabase, user } = await requireAuthenticatedUser();
  const { fieldErrors, values } = validateOnboardingProfile(
    readOnboardingProfile(formData),
  );

  if (fieldErrors) {
    return { fieldErrors };
  }

  const { error } = await saveOnboardingProfile(supabase, user.id, values);

  if (error) {
    return {
      error: "탑승 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const {
    count: faceImageCount,
    error: existingFaceImagesError,
  } = await supabase
    .from("profile_face_images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (existingFaceImagesError) {
    return {
      error: "얼굴 사진 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const ownedFaceImageCount = faceImageCount ?? 0;

  if (ownedFaceImageCount < MIN_FACE_IMAGE_COUNT) {
    return {
      fieldErrors: {
        photos: "얼굴 사진을 먼저 업로드해 주세요.",
      },
    };
  }

  if (ownedFaceImageCount > MAX_FACE_IMAGE_COUNT) {
    return {
      fieldErrors: {
        photos: "사진 구성을 다시 확인해 주세요.",
      },
    };
  }

  const { error: completionError } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (completionError) {
    return {
      error: "여권 발행을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  redirect("/");
}

export async function saveOnboardingProfileDraft(
  input: OnboardingProfileInput,
): Promise<OnboardingDraftResult> {
  const { supabase, user } = await requireAuthenticatedUser();
  const { fieldErrors, values } = validateOnboardingProfile(input);

  if (fieldErrors) {
    return { fieldErrors };
  }

  const { error } = await saveOnboardingProfile(supabase, user.id, values);

  if (error) {
    return {
      error: "프로필 초안을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {};
}
