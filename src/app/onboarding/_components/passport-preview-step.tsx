'use client';

/* eslint-disable @next/next/no-img-element */

type PassportPreviewStepProps = {
  ageRangeLabel: string;
  hasProfileFieldErrors: boolean;
  issueDate: string;
  onPreviousStep: () => void;
  pending: boolean;
  photoError?: string;
  primaryPhoto: string | null | undefined;
  serverError?: string;
  genderLabel: string;
  passengerName: string;
};

export default function PassportPreviewStep({
  ageRangeLabel,
  hasProfileFieldErrors,
  issueDate,
  onPreviousStep,
  pending,
  photoError,
  primaryPhoto,
  serverError,
  genderLabel,
  passengerName,
}: PassportPreviewStepProps) {
  return (
    <>
      <div className="space-y-2">
        <span className="stamp stamp-sage">READY</span>
        <h2 className="font-display text-[34px] leading-[0.95] tracking-[-0.04em]">
          여권이 준비되었습니다
        </h2>
        <p className="max-w-xl text-[15px] leading-[1.75] opacity-65">
          마지막으로 확인하고 발행하면 홈으로 돌아갑니다. 다음 단계의 시대 선택
          화면이 붙으면 이 버튼을 바로 첫 여행 CTA로 바꾸면 됩니다.
        </p>
      </div>

      <div className="rounded-[30px] border border-[rgba(76,53,34,0.12)] bg-[linear-gradient(180deg,rgba(251,247,239,0.98),rgba(235,226,210,0.96))] p-6 shadow-[0_26px_60px_-28px_rgba(0,0,0,.22)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-45">
              TIMELEAP PASSPORT
            </div>
            <div className="font-display mt-3 text-[34px] tracking-[-0.04em]">
              {passengerName}
            </div>
          </div>
          <div className="border-sage/35 text-sage flex h-22 w-22 items-center justify-center rounded-full border text-center font-mono text-[12px] leading-[1.25] tracking-[0.12em] uppercase">
            Valid
            <br />
            {new Date().getFullYear()}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[200px_1fr]">
          <div className="bg-paper/90 border-ink/10 overflow-hidden rounded-[24px] border">
            {primaryPhoto ? (
              <img
                alt="대표 얼굴 사진"
                className="aspect-[3/4] h-full w-full object-cover"
                src={primaryPhoto}
              />
            ) : (
              <div className="bg-paper-2/70 text-center text-[13px] leading-[1.7] opacity-55">
                사진을 선택하면 여권 사진이 여기 들어갑니다.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border-ink/10 rounded-[20px] border bg-paper/65 px-4 py-4">
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
                Gender
              </div>
              <div className="mt-2 font-display text-[23px] tracking-[-0.03em]">
                {genderLabel}
              </div>
            </div>
            <div className="border-ink/10 rounded-[20px] border bg-paper/65 px-4 py-4">
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
                Age
              </div>
              <div className="mt-2 font-display text-[23px] tracking-[-0.03em]">
                {ageRangeLabel}
              </div>
            </div>
            <div className="border-ink/10 rounded-[20px] border bg-paper/65 px-4 py-4">
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
                Issued
              </div>
              <div className="mt-2 font-display text-[23px] tracking-[-0.03em]">
                {issueDate}
              </div>
            </div>
            <div className="border-ink/10 rounded-[20px] border bg-paper/65 px-4 py-4">
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
                Trips
              </div>
              <div className="mt-2 font-display text-[23px] tracking-[-0.03em]">
                0
              </div>
            </div>
          </div>
        </div>
      </div>

      {serverError ? (
        <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
          {serverError}
        </div>
      ) : null}
      {photoError ? (
        <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
          {photoError}
        </div>
      ) : null}
      {hasProfileFieldErrors ? (
        <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
          입력 정보를 다시 확인해 주세요. 이전 단계에서 닉네임, 성별, 연령대를
          수정할 수 있어요.
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
          className="bg-ink text-paper font-display rounded-full px-6 py-3.5 text-[15px] tracking-[-0.01em] shadow-[0_2px_0_rgba(0,0,0,.1),0_12px_30px_-16px_rgba(0,0,0,.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={pending}
          type="submit"
        >
          {pending ? "여권 발행 중..." : "여권 발행 완료"}
        </button>
      </div>
    </>
  );
}
