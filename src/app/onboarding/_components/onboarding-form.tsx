'use client';

import { useActionState } from "react";
import { completeOnboarding } from "@/actions/auth";
import {
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
} from "@/lib/auth/profile-options";

type OnboardingFormProps = {
  defaultValues: {
    ageRange: string;
    displayName: string;
    gender: string;
    username: string;
  };
};

const INITIAL_STATE = {
  error: undefined,
  fieldErrors: {},
};

export default function OnboardingForm({
  defaultValues,
}: OnboardingFormProps) {
  const [state, action, pending] = useActionState(
    completeOnboarding,
    INITIAL_STATE,
  );

  return (
    <form action={action} className="space-y-5">
      <div>
        <label
          htmlFor="displayName"
          className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45"
        >
          이름
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={defaultValues.displayName}
          maxLength={40}
          placeholder="타임리프 안에서 불릴 이름"
          className="border-ink/12 bg-paper-2/70 w-full rounded-2xl border px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:opacity-35 focus:border-[rgba(76,53,34,0.35)]"
        />
        {state.fieldErrors?.displayName ? (
          <p className="mt-2 text-[12px] opacity-55">
            {state.fieldErrors.displayName}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="username"
          className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45"
        >
          아이디
        </label>
        <input
          id="username"
          name="username"
          defaultValue={defaultValues.username}
          maxLength={20}
          placeholder="영문 소문자, 숫자, 밑줄"
          className="border-ink/12 bg-paper-2/70 w-full rounded-2xl border px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:opacity-35 focus:border-[rgba(76,53,34,0.35)]"
        />
        {state.fieldErrors?.username ? (
          <p className="mt-2 text-[12px] opacity-55">
            {state.fieldErrors.username}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="gender"
            className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45"
          >
            성별
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={defaultValues.gender}
            className="border-ink/12 bg-paper-2/70 w-full rounded-2xl border px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-[rgba(76,53,34,0.35)]"
          >
            <option value="">선택 안 함</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.gender ? (
            <p className="mt-2 text-[12px] opacity-55">
              {state.fieldErrors.gender}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="ageRange"
            className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45"
          >
            연령대
          </label>
          <select
            id="ageRange"
            name="ageRange"
            defaultValue={defaultValues.ageRange}
            className="border-ink/12 bg-paper-2/70 w-full rounded-2xl border px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-[rgba(76,53,34,0.35)]"
          >
            <option value="">선택 안 함</option>
            {AGE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.ageRange ? (
            <p className="mt-2 text-[12px] opacity-55">
              {state.fieldErrors.ageRange}
            </p>
          ) : null}
        </div>
      </div>

      {state.error ? (
        <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper font-display flex w-full items-center justify-center rounded-full px-6 py-4 text-[15px] font-medium tracking-[-0.01em] shadow-[0_2px_0_rgba(0,0,0,.1),0_10px_30px_-10px_rgba(0,0,0,.4)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "탑승 정보 저장 중..." : "탑승 준비 마치기"}
      </button>
    </form>
  );
}
