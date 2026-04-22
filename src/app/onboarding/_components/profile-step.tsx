'use client';

import {
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
} from "@/lib/auth/profile-options";

type ProfileStepProps = {
  draftError?: string;
  errors: {
    ageRange?: string;
    displayName?: string;
    gender?: string;
  };
  onFieldChange: (
    field: "ageRange" | "displayName" | "gender",
    value: string,
  ) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  profile: {
    ageRange: string;
    displayName: string;
    gender: string;
  };
  profileIsReady: boolean;
  savePending: boolean;
};

export default function ProfileStep({
  draftError,
  errors,
  onFieldChange,
  onNextStep,
  onPreviousStep,
  profile,
  profileIsReady,
  savePending,
}: ProfileStepProps) {
  const { ageRange, displayName, gender } = profile;
  const { ageRange: ageRangeError, displayName: displayNameError, gender: genderError } =
    errors;

  return (
    <>
      <div className="space-y-2">
        <span className="stamp">STEP 02</span>
        <h2 className="font-display text-[34px] leading-[0.95] tracking-[-0.04em]">
          어떻게 불러 드릴까요
        </h2>
        <p className="max-w-xl text-[15px] leading-[1.75] opacity-65">
          닉네임과 간단한 정보가 더 섬세한 시대 경험을 만듭니다. 프로필 수정
          화면이 생기면 언제든 다시 바꿀 수 있게 두는 편이 맞습니다.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label
            className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45"
            htmlFor="displayName"
          >
            닉네임
          </label>
          <input
            className="border-ink/12 bg-paper-2/70 w-full rounded-2xl border px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:opacity-35 focus:border-[rgba(76,53,34,0.35)]"
            id="displayName"
            maxLength={40}
            onChange={(event) => {
              onFieldChange("displayName", event.target.value);
            }}
            placeholder="예: 지민"
            value={displayName}
          />
          {displayNameError ? (
            <p className="mt-2 text-[12px] opacity-55">{displayNameError}</p>
          ) : null}
        </div>

        <div>
          <span className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45">
            성별
          </span>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((option) => {
              const active = gender === option.value;

              return (
                <button
                  key={option.value}
                  className={`rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/12 bg-paper-2/60 hover:border-ink/35"
                  }`}
                  onClick={() => {
                    onFieldChange("gender", option.value);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {genderError ? (
            <p className="mt-2 text-[12px] opacity-55">{genderError}</p>
          ) : null}
        </div>

        <div>
          <span className="font-mono mb-2 block text-[10px] tracking-[0.14em] uppercase opacity-45">
            연령대
          </span>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGE_OPTIONS.map((option) => {
              const active = ageRange === option.value;

              return (
                <button
                  key={option.value}
                  className={`rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/12 bg-paper-2/60 hover:border-ink/35"
                  }`}
                  onClick={() => {
                    onFieldChange("ageRange", option.value);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {ageRangeError ? (
            <p className="mt-2 text-[12px] opacity-55">{ageRangeError}</p>
          ) : null}
        </div>
      </div>

      {draftError ? (
        <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
          {draftError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="rounded-full px-5 py-3 font-mono text-[11px] tracking-[0.12em] uppercase opacity-60 transition-opacity hover:opacity-100"
          onClick={onPreviousStep}
          type="button"
        >
          ← 이전
        </button>
        <button
          className="bg-ink text-paper font-display rounded-full px-6 py-3.5 text-[15px] tracking-[-0.01em] shadow-[0_2px_0_rgba(0,0,0,.1),0_12px_30px_-16px_rgba(0,0,0,.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!profileIsReady || savePending}
          onClick={onNextStep}
          type="button"
        >
          {savePending ? "프로필 저장 중..." : "여권 미리보기 →"}
        </button>
      </div>
    </>
  );
}
