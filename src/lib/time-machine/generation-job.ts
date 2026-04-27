import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

const GENERATION_JOB_COLUMNS =
  "id,user_id,country_code,era_id,status,diary_id,error_message,lease_expires_at,started_at,completed_at,failed_at,created_at,updated_at";
const GENERATION_JOB_LEASE_MS = 10 * 60 * 1000;
const RUNNING_STATUS = "running";
const SUCCEEDED_STATUS = "succeeded";
const FAILED_STATUS = "failed";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export type GenerationJobRecord = Tables<"generation_jobs">;
export type GenerationJobClaim =
  | { job: GenerationJobRecord; kind: "created" }
  | { job: GenerationJobRecord; kind: "existing" };

function createLeaseExpiresAt() {
  return new Date(Date.now() + GENERATION_JOB_LEASE_MS).toISOString();
}

export function isGenerationJobRunning(job: GenerationJobRecord) {
  return job.status === RUNNING_STATUS;
}

export function isGenerationJobSucceeded(job: GenerationJobRecord) {
  return job.status === SUCCEEDED_STATUS;
}

export function isGenerationJobFailed(job: GenerationJobRecord) {
  return job.status === FAILED_STATUS;
}

export function hasGenerationJobLeaseExpired(job: GenerationJobRecord) {
  return (
    isGenerationJobRunning(job) &&
    new Date(job.lease_expires_at).getTime() <= Date.now()
  );
}

export async function getGenerationJobById({
  generationRequestId,
  supabase,
  userId,
}: {
  generationRequestId: string;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select(GENERATION_JOB_COLUMNS)
    .eq("id", generationRequestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`생성 작업 조회에 실패했습니다. ${error.message}`);
  }

  return data;
}

export async function createOrGetGenerationJob({
  countryCode,
  eraId,
  generationRequestId,
  supabase,
  userId,
}: {
  countryCode: string;
  eraId: string;
  generationRequestId: string;
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<GenerationJobClaim> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      country_code: countryCode,
      era_id: eraId,
      id: generationRequestId,
      lease_expires_at: createLeaseExpiresAt(),
      status: RUNNING_STATUS,
      user_id: userId,
    })
    .select(GENERATION_JOB_COLUMNS)
    .single();

  if (!error && data) {
    return {
      job: data,
      kind: "created",
    };
  }

  if (error?.code !== "23505") {
    throw new Error(
      `생성 작업 시작에 실패했습니다.${error ? ` ${error.message}` : ""}`,
    );
  }

  const existingJob = await getGenerationJobById({
    generationRequestId,
    supabase,
    userId,
  });

  if (!existingJob) {
    throw new Error("이미 처리 중인 생성 작업을 확인할 수 없습니다.");
  }

  return {
    job: existingJob,
    kind: "existing",
  };
}

export async function markGenerationJobSucceeded({
  diaryId,
  generationRequestId,
  supabase,
  userId,
}: {
  diaryId: string;
  generationRequestId: string;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      completed_at: now,
      diary_id: diaryId,
      error_message: null,
      failed_at: null,
      status: SUCCEEDED_STATUS,
      updated_at: now,
    })
    .eq("id", generationRequestId)
    .eq("user_id", userId)
    .select(GENERATION_JOB_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(
      `생성 작업 완료 처리에 실패했습니다.${error ? ` ${error.message}` : ""}`,
    );
  }

  return data;
}

export async function markGenerationJobFailed({
  errorMessage,
  generationRequestId,
  supabase,
  userId,
}: {
  errorMessage: string;
  generationRequestId: string;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      error_message: errorMessage,
      failed_at: now,
      status: FAILED_STATUS,
      updated_at: now,
    })
    .eq("id", generationRequestId)
    .eq("user_id", userId)
    .select(GENERATION_JOB_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(
      `생성 작업 실패 처리에 실패했습니다.${error ? ` ${error.message}` : ""}`,
    );
  }

  return data;
}
