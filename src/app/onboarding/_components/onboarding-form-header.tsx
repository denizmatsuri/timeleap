type OnboardingFormHeaderProps = {
  currentStep: number;
  maxSelectableStep: number;
  onStepSelect: (step: number) => void;
  passengerName: string;
  photoCount: number;
};

const STEPS = ["얼굴 사진", "프로필", "완료"] as const;

export default function OnboardingFormHeader({
  currentStep,
  maxSelectableStep,
  onStepSelect,
  passengerName,
  photoCount,
}: OnboardingFormHeaderProps) {
  return (
    <div className="border-ink/10 border-b border-dashed px-6 py-5 lg:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="stamp inline-flex">PASSPORT CHECK</span>
            <div className="font-mono text-[10px] tracking-[.15em] opacity-35">
              NO. 00412
            </div>
          </div>
          <h1 className="font-display mt-4 text-[clamp(28px,4vw,44px)] leading-[0.96] tracking-[-0.04em]">
            얼굴 사진부터 <em>여권 발행</em>까지
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-[1.7] opacity-55">
            현재 단계에 필요한 내용만 보여주도록 정리했습니다. 가이드를 먼저
            확인하고, 바로 아래에서 사진을 업로드할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="border-ink/12 bg-paper-2/70 rounded-full border px-3 py-2 font-mono text-[10px] tracking-[0.1em] uppercase opacity-55">
            {passengerName}
          </div>
          <div className="border-ink/12 bg-paper-2/70 rounded-full border px-3 py-2 font-mono text-[10px] tracking-[0.1em] uppercase opacity-55">
            STEP 0{currentStep + 1}
          </div>
          <div className="border-ink/12 bg-paper-2/70 rounded-full border px-3 py-2 font-mono text-[10px] tracking-[0.1em] uppercase opacity-55">
            {photoCount} READY
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((label, index) => {
          const active = index === currentStep;
          const completed = index < currentStep;
          const canSelect = index <= maxSelectableStep;

          return (
            <button
              key={label}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 transition-colors ${
                active
                  ? "border-ink/18 bg-paper-2/75"
                  : canSelect
                    ? "border-ink/10 bg-paper/55 hover:border-ink/18 hover:bg-paper-2/65"
                    : "border-ink/8 bg-paper/40 opacity-55"
              }`}
              disabled={!canSelect}
              onClick={() => {
                onStepSelect(index);
              }}
              type="button"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] ${
                  completed
                    ? "bg-ink text-paper"
                    : active
                      ? "border-ink/18 border bg-paper"
                      : "border-ink/10 border bg-transparent"
                }`}
              >
                {completed ? "✓" : index + 1}
              </div>
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase">
                {label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
