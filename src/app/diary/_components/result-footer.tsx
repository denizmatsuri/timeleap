"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDiary, setDiaryVisibility } from "@/actions/diary";

type ResultFooterProps = {
  diaryId: string;
  initialIsPublic: boolean;
  isOwner: boolean;
  tags: readonly string[];
};

const SHARE_RESET_DELAY_MS = 1800;

export default function ResultFooter({
  diaryId,
  initialIsPublic,
  isOwner,
  tags,
}: ResultFooterProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [liked, setLiked] = useState(false);
  const [shareLabel, setShareLabel] = useState("↑ 공유");
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [isVisibilityPending, startVisibilityTransition] = useTransition();

  const visibilityDescription = isPublic
    ? "공개 갤러리에 노출됩니다."
    : "나만 볼 수 있습니다. 언제든 변경 가능해요.";
  const visibilityActionLabel = isVisibilityPending ? "저장 중" : "공개";
  const likeLabel = liked ? "♥ 좋아요 표시됨" : "♡ 좋아요";

  function handleToggleVisibility() {
    const nextIsPublic = !isPublic;

    setVisibilityError(null);
    startVisibilityTransition(() => {
      void setDiaryVisibility(diaryId, nextIsPublic)
        .then((result) => {
          setIsPublic(result.isPublic);
          router.refresh();
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error && error.message.trim()
              ? error.message
              : "공개 상태를 저장하지 못했습니다.";

          setVisibilityError(message);
        });
    });
  }

  async function handleShare() {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Timeleap Diary",
          text: "내 Timeleap 여행기를 공유합니다.",
          url: shareUrl,
        });
        setShareLabel("✓ 공유됨");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareLabel("✓ 링크 복사됨");
      }
    } catch {
      setShareLabel("공유 취소");
    }

    window.setTimeout(() => {
      setShareLabel("↑ 공유");
    }, SHARE_RESET_DELAY_MS);
  }

  return (
    <section className="mx-auto mt-14 max-w-[780px] px-6 pb-2">
      <div className="mb-8 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="border-ink/12 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase opacity-70"
          >
            {tag}
          </span>
        ))}
      </div>

      {isOwner ? (
        <div className="border-ink/12 bg-ink/4 mb-6 flex flex-col gap-5 rounded-[18px] border px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-[20px] tracking-[-0.02em]">
              이 여행기를 공개할까요?
            </div>
            <div className="mt-1 text-[13px] leading-[1.7] opacity-70">
              {visibilityDescription}
            </div>
            {visibilityError ? (
              <div className="text-coral mt-2 text-[13px] leading-[1.6]">
                {visibilityError}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label={`여행기 ${visibilityActionLabel} 상태 전환`}
            aria-pressed={isPublic}
            disabled={isVisibilityPending}
            onClick={handleToggleVisibility}
            className={`relative flex h-10 w-[130px] cursor-pointer items-center rounded-full border px-[3px] transition-colors disabled:cursor-wait disabled:opacity-60 ${
              isPublic ? "border-ink/20 bg-ink/12" : "border-ink/18 bg-ink/8"
            }`}
          >
            <span
              className={`bg-ember text-night absolute top-[3px] h-8 w-[60px] rounded-full transition-[left] duration-300 ${
                isPublic ? "left-[calc(100%-63px)]" : "left-[3px]"
              }`}
            />
            <span
              className={`z-10 flex-1 text-center font-mono text-[10px] tracking-[0.1em] uppercase ${
                isPublic ? "opacity-50" : "opacity-100"
              }`}
            >
              비공개
            </span>
            <span
              className={`z-10 flex-1 text-center font-mono text-[10px] tracking-[0.1em] uppercase ${
                isPublic ? "opacity-100" : "opacity-50"
              }`}
            >
              공개
            </span>
          </button>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setLiked((currentValue) => !currentValue);
          }}
          className={`cursor-pointer rounded-full px-4 py-3 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors ${
            liked
              ? "bg-coral/12 text-coral"
              : "bg-ink/8 hover:bg-ink/12 text-ink"
          }`}
        >
          {likeLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          className="bg-ink/8 text-ink hover:bg-ink/12 cursor-pointer rounded-full px-4 py-3 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors"
        >
          {shareLabel}
        </button>
      </div>

      <div className="border-ink/12 flex flex-wrap justify-center gap-3 border-t pt-6">
        {isOwner ? (
          <Link
            href="/me"
            className="bg-ink text-paper font-display rounded-full px-7 py-4 text-[15px] tracking-[-0.01em] transition-transform hover:-translate-y-px"
          >
            내 기록 보기
          </Link>
        ) : null}
        {isOwner ? (
          <form action={deleteDiary}>
            <input type="hidden" name="diaryId" value={diaryId} />
            <button
              type="submit"
              className="bg-coral/12 text-coral hover:bg-coral/18 font-display cursor-pointer rounded-full px-7 py-4 text-[15px] tracking-[-0.01em] transition-colors"
            >
              삭제
            </button>
          </form>
        ) : null}
        <Link
          href="/time-machine"
          className="bg-ink/8 hover:bg-ink/12 font-display rounded-full px-7 py-4 text-[15px] tracking-[-0.01em] transition-colors"
        >
          ✦ 다시 떠나기
        </Link>
        <Link
          href="/"
          className="bg-ink/8 hover:bg-ink/12 font-display rounded-full px-7 py-4 text-[15px] tracking-[-0.01em] transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </section>
  );
}
