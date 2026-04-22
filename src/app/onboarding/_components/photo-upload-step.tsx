'use client';

import type { ChangeEvent, RefObject } from "react";
import type { PhotoItemState } from "./use-onboarding-photos";

/* eslint-disable @next/next/no-img-element */

type PhotoUploadStepProps = {
  onNextStep: () => void;
  onOpenFilePicker: () => void;
  onPhotoSelection: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemovePhoto: (photo: PhotoItemState) => void;
  photoError?: string;
  photoFeedback: string;
  photos: PhotoItemState[];
  photosAreReady: boolean;
  selectedPhotoCount: number;
  uploadPending: boolean;
  uploadInputRef: RefObject<HTMLInputElement | null>;
};

export default function PhotoUploadStep({
  onNextStep,
  onOpenFilePicker,
  onPhotoSelection,
  onRemovePhoto,
  photoError,
  photoFeedback,
  photos,
  photosAreReady,
  selectedPhotoCount,
  uploadPending,
  uploadInputRef,
}: PhotoUploadStepProps) {
  const nextStepLabel = uploadPending ? "사진 업로드 중..." : "다음 단계 →";

  return (
    <>
      <input
        ref={uploadInputRef}
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event) => {
          void onPhotoSelection(event);
        }}
        type="file"
      />

      <section className="space-y-4">
        <div className="space-y-2">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
            업로드 가이드
          </div>
          <h2 className="font-display text-[30px] leading-[0.98] tracking-[-0.04em]">
            다양한 사진을 준비해 주세요
          </h2>
          <p className="max-w-3xl text-[14px] leading-[1.75] opacity-68">
            다양한 장소, 각도, 옷, 표정에서 클로즈업 셀카와 전신 사진을
            혼합한 다양한 종류의 사진을 업로드하는 것이 좋습니다. 다양성이 낮은
            사진, 단체 사진, 다른 사람, 선글라스, 모자, 얼굴이 잘리거나 보이지
            않는 사진은 업로드하지 마세요.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
              Good
            </div>
            <div className="mt-2 space-y-1.5 text-[14px] leading-[1.7] opacity-65">
              <p>✓ 다양한 장소와 배경</p>
              <p>✓ 각도, 옷, 표정 변화</p>
              <p>✓ 클로즈업 셀카와 전신 사진 혼합</p>
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-45">
              Avoid
            </div>
            <div className="mt-2 space-y-1.5 text-[14px] leading-[1.7] opacity-65">
              <p>✕ 단체 사진이나 다른 사람 포함</p>
              <p>✕ 선글라스, 모자, 얼굴 가림</p>
              <p>✕ 얼굴이 잘리거나 해상도가 낮은 사진</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-dashed border-[rgba(76,53,34,0.1)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-[24px] tracking-[-0.03em]">
              사진 업로드
            </div>
            <div className="mt-1 text-[14px] opacity-60">
              선택한 사진은 먼저 검수하고, 다음 단계로 넘어갈 때 업로드합니다.
            </div>
          </div>
          <button
            className="bg-ink text-paper font-display rounded-full px-5 py-3 text-[15px] tracking-[-0.01em] shadow-[0_2px_0_rgba(0,0,0,.1),0_12px_30px_-16px_rgba(0,0,0,.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={selectedPhotoCount >= 10}
            onClick={onOpenFilePicker}
            type="button"
          >
            {selectedPhotoCount === 0 ? "사진 선택하기" : "사진 추가하기"}
          </button>
        </div>

        {photoFeedback ? (
          <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
            {photoFeedback}
          </div>
        ) : null}
        {photoError ? (
          <div className="border-ink/12 bg-paper-2/80 rounded-2xl border px-4 py-3 text-[13px] opacity-65">
            {photoError}
          </div>
        ) : null}

        {photos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="border-ink/12 bg-paper-2/45 relative overflow-hidden rounded-[28px] border p-3 shadow-[0_18px_40px_-28px_rgba(0,0,0,.28)]"
              >
                <div className="bg-ink/8 relative aspect-[3/4] overflow-hidden rounded-[22px]">
                  <img
                    alt={`업로드 사진 ${index + 1}`}
                    className="h-full w-full object-cover"
                    src={photo.previewUrl ?? undefined}
                  />
                  <div className="from-ink/55 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent px-3 pb-3 pt-12 text-paper">
                    <div className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
                      Photo {index + 1}
                    </div>
                    <div className="mt-1 text-[13px]">
                      {photo.storagePath
                        ? "기본 검수 완료"
                        : uploadPending
                          ? "업로드 중..."
                          : "업로드 준비 완료"}
                    </div>
                  </div>
                  <button
                    className="bg-paper/92 text-ink absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[16px] shadow-[0_10px_20px_-16px_rgba(0,0,0,.5)] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={uploadPending}
                    onClick={() => {
                      onRemovePhoto(photo);
                    }}
                    type="button"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-1 px-1 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-[18px] tracking-[-0.02em]">
                      사진 {index + 1}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-50">
                      {index === 0 ? "Primary" : "Reference"}
                    </div>
                  </div>
                  <div className="truncate text-[13px] opacity-55">
                    {photo.fileName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            className="hover:border-ink/35 hover:bg-paper/80 flex min-h-[320px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-[rgba(76,53,34,0.16)] px-6 text-center transition-colors"
            onClick={onOpenFilePicker}
            type="button"
          >
            <span className="bg-paper shadow-[0_12px_24px_-18px_rgba(0,0,0,.55)] mb-5 flex h-14 w-14 items-center justify-center rounded-full">
              <svg
                aria-hidden="true"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 16 16"
                width="24"
              >
                <path d="M8 11V3" />
                <path d="m5 6 3-3 3 3" />
                <path d="M3 12h10" />
              </svg>
            </span>
            <div className="font-display text-[24px] tracking-[-0.03em]">
              사진 선택하기
            </div>
            <div className="mt-2 max-w-md text-[14px] leading-[1.7] opacity-60">
              업로드한 사진은 여기에서 미리보고 삭제할 수 있습니다.
            </div>
          </button>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] leading-[1.7] opacity-50">
          선택한 사진을 확인한 뒤, 다음 단계로 넘어갈 때 한 번에 업로드합니다.
        </div>
        <button
          className="bg-ink text-paper font-display rounded-full px-6 py-3.5 text-[15px] tracking-[-0.01em] shadow-[0_2px_0_rgba(0,0,0,.1),0_12px_30px_-16px_rgba(0,0,0,.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!photosAreReady || uploadPending}
          onClick={onNextStep}
          type="button"
        >
          {nextStepLabel}
        </button>
      </div>
    </>
  );
}
