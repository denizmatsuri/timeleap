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
  username?: string;
};

export type OnboardingFormState = {
  error?: string;
  fieldErrors?: OnboardingFieldErrors;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

function normalizeUsername(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.length === 0) {
    return { value: null };
  }

  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    return {
      error: "아이디는 영문 소문자, 숫자, 밑줄만 사용할 수 있어요.",
      value: normalized,
    };
  }

  return { value: normalized };
}

function normalizeGender(value: string) {
  if (value.length === 0) {
    return { value: null };
  }

  const isValid = GENDER_OPTIONS.some((option) => option.value === value);

  if (!isValid) {
    return { error: "성별 값을 다시 확인해 주세요.", value };
  }

  return { value: value as GenderOptionValue };
}

function normalizeAgeRange(value: string) {
  if (value.length === 0) {
    return { value: null };
  }

  const isValid = AGE_RANGE_OPTIONS.some((option) => option.value === value);

  if (!isValid) {
    return { error: "연령대 값을 다시 확인해 주세요.", value };
  }

  return { value: value as AgeRangeOptionValue };
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
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(createLoginRedirectPath("/onboarding"));
  }

  const displayName = normalizeDisplayName(readText(formData, "displayName"));
  const username = normalizeUsername(readText(formData, "username"));
  const gender = normalizeGender(readText(formData, "gender"));
  const ageRange = normalizeAgeRange(readText(formData, "ageRange"));

  const fieldErrors: OnboardingFieldErrors = {
    ageRange: ageRange.error,
    displayName: displayName.error,
    gender: gender.error,
    username: username.error,
  };

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

  if (hasFieldErrors) {
    return { fieldErrors };
  }

  const payload: TablesInsert<"profiles"> = {
    id: user.id,
    age_range: ageRange.value,
    display_name: displayName.value,
    gender: gender.value,
    onboarding_completed_at: new Date().toISOString(),
    username: username.value,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    if (error.code === "23505") {
      return {
        fieldErrors: {
          username: "이미 사용 중인 아이디예요. 다른 값을 입력해 주세요.",
        },
      };
    }

    return {
      error: "탑승 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  redirect("/");
}
