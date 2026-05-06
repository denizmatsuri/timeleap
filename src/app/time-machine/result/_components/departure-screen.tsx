"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateDiaryFromSelection,
  getDiaryGenerationStatus,
} from "@/actions/time-machine";
import styles from "./departure-screen.module.css";

const REDIRECT_DELAY_MS = 3000;
const STATUS_POLL_INTERVAL_MS = 2000;
const STATUS_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const PHASE_TIMINGS = [0, 800, 1600, 2400] as const;

type DepartureScreenProps = {
  countryCode: string;
  countryFlag: string;
  countryName: string;
  eraEmoji: string;
  eraId: string;
  eraLabel: string;
  eraTitle: string;
  generationRequestId: string;
  latitude: number;
  longitude: number;
};

const PHASES = [
  { description: "좌표를 입력하는 중…", number: "01", title: "타임머신 가동" },
  { description: "시공간을 통과합니다…", number: "02", title: "가속" },
  { description: "선택한 시대로 접근 중…", number: "03", title: "시간의 터널" },
  { description: "도착 좌표를 고정합니다…", number: "04", title: "도착 준비" },
] as const;

type GenerationFlowInput = {
  countryCode: string;
  eraId: string;
  generationRequestId: string;
};

type GenerationFlowResult = {
  diaryId: string;
};

function formatCoordinate(
  value: number,
  negativeSuffix: string,
  positiveSuffix: string,
) {
  return `${Math.abs(value).toFixed(2)}°${value < 0 ? negativeSuffix : positiveSuffix}`;
}

function waitForStatusPollDelay() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, STATUS_POLL_INTERVAL_MS);
  });
}

async function waitForExistingGeneration({
  generationRequestId,
}: Pick<
  GenerationFlowInput,
  "generationRequestId"
>): Promise<GenerationFlowResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < STATUS_POLL_TIMEOUT_MS) {
    await waitForStatusPollDelay();

    const status = await getDiaryGenerationStatus({
      generationRequestId,
    });

    if (status.status === "succeeded") {
      return {
        diaryId: status.diaryId,
      };
    }

    if (status.status === "failed") {
      throw new Error(status.message);
    }
  }

  throw new Error(
    "생성 상태 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
  );
}

async function runGenerationFlow({
  countryCode,
  eraId,
  generationRequestId,
}: GenerationFlowInput): Promise<GenerationFlowResult> {
  const result = await generateDiaryFromSelection({
    countryCode,
    eraId,
    generationRequestId,
  });

  if (result.status === "succeeded") {
    return {
      diaryId: result.diaryId,
    };
  }

  if (result.status === "failed") {
    throw new Error(result.message);
  }

  return waitForExistingGeneration({
    generationRequestId,
  });
}

export default function DepartureScreen({
  countryCode,
  countryFlag,
  countryName,
  eraEmoji,
  eraId,
  eraLabel,
  eraTitle,
  generationRequestId,
  latitude,
  longitude,
}: DepartureScreenProps) {
  const router = useRouter();
  const generationPromiseRef = useRef<Promise<GenerationFlowResult> | null>(
    null,
  );
  const generationRequestIdRef = useRef(generationRequestId);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const currentPhase = PHASES[phaseIndex];
  const showArrival = phaseIndex === PHASES.length - 1;
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, index) => ({
      delay: `${(index * 0.11) % 3}s`,
      left: `${(index * 13) % 100}%`,
      size: `${((index * 7) % 3) + 1}px`,
      top: `${(index * 37) % 100}%`,
    }));
  }, []);
  const streaks = useMemo(() => {
    return Array.from({ length: 24 }, (_, index) => ({
      delay: `${(index * 0.08) % 1.5}s`,
      top: `${(index * 11) % 100}%`,
      translateY: `${(index * 17) % 20}px`,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = PHASE_TIMINGS.map((timing, index) =>
      window.setTimeout(() => {
        setPhaseIndex(index);
      }, timing),
    );
    const minimumDelay = new Promise<void>((resolve) => {
      const delayTimer = window.setTimeout(() => {
        resolve();
      }, REDIRECT_DELAY_MS);

      timers.push(delayTimer);
    });

    if (generationRequestIdRef.current !== generationRequestId) {
      generationPromiseRef.current = null;
      generationRequestIdRef.current = generationRequestId;
    }

    if (!generationPromiseRef.current) {
      generationPromiseRef.current = runGenerationFlow({
        countryCode,
        eraId,
        generationRequestId,
      });
    }

    const generationPromise = generationPromiseRef.current;

    startTransition(() => {
      void Promise.all([generationPromise, minimumDelay])
        .then(([result]) => {
          if (cancelled) {
            return;
          }

          router.replace(`/diaries/${result.diaryId}`);
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          generationPromiseRef.current = null;

          if (error instanceof Error && error.message.trim()) {
            setGenerationError(error.message);
            return;
          }

          setGenerationError(
            "여행기를 생성하지 못했습니다. 다시 시도해 주세요.",
          );
        });
    });

    return () => {
      cancelled = true;

      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [countryCode, eraId, generationRequestId, retryCount, router]);

  return (
    <div className={styles.departure}>
      <div className={styles.stars}>
        {stars.map((star, index) => (
          <span
            key={`star-${index}`}
            className={styles.star}
            style={{
              animationDelay: star.delay,
              height: star.size,
              left: star.left,
              top: star.top,
              width: star.size,
            }}
          />
        ))}
      </div>

      <div className={`${styles.tunnel} ${styles[`tunnel${phaseIndex}`]}`}>
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={`ring-${index}`}
            className={styles.ring}
            style={{ animationDelay: `${index * 0.16}s` }}
          />
        ))}
      </div>

      <div
        className={`${styles.streaks} ${styles[`streaks${Math.min(phaseIndex, 2)}`]}`}
      >
        {streaks.map((streak, index) => (
          <span
            key={`streak-${index}`}
            className={styles.streak}
            style={{
              animationDelay: streak.delay,
              top: streak.top,
              transform: `translateY(${streak.translateY})`,
            }}
          />
        ))}
      </div>

      <div className={styles.center}>
        <div className={styles.compass}>
          <span className={`${styles.compassRing} ${styles.compassRingOne}`} />
          <span className={`${styles.compassRing} ${styles.compassRingTwo}`} />
          <span
            className={`${styles.compassRing} ${styles.compassRingThree}`}
          />
          <div className={styles.compassHub}>
            <span className={styles.compassEmoji}>{eraEmoji}</span>
          </div>
          <div className={styles.ticks}>
            {Array.from({ length: 24 }, (_, index) => (
              <span
                key={`tick-${index}`}
                className={styles.tick}
                style={{
                  transform: `rotate(${index * 15}deg) translateY(-90px)`,
                }}
              />
            ))}
          </div>
        </div>

        {generationError ? (
          <div className={styles.errorCard}>
            <div className={styles.errorTitle}>기록이 흔들렸습니다.</div>
            <div className={styles.errorDescription}>{generationError}</div>
            <div className={styles.errorActions}>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => {
                  setGenerationError(null);
                  setPhaseIndex(0);
                  setRetryCount((currentValue) => currentValue + 1);
                }}
              >
                다시 생성하기
              </button>
              <Link href="/time-machine" className={styles.secondaryButton}>
                좌표 다시 고르기
              </Link>
            </div>
          </div>
        ) : showArrival ? (
          <div className={styles.arrival}>
            <div className={styles.arrivalStampWrap}>
              <div className={styles.arrivalStamp}>
                <div className={styles.arrivalStampRing}>
                  <span className={styles.arrivalStampTop}>ARRIVED</span>
                  <span className={styles.arrivalStampBottom}>
                    TIMELEAP · {eraLabel}
                  </span>
                </div>
                <div className={styles.arrivalStampCenter}>
                  <div className={styles.arrivalYear}>{eraLabel}</div>
                  <div className={styles.arrivalCountry}>
                    {countryFlag} {countryName}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.arrivalTitle}>도착했습니다.</div>
            <div className={styles.arrivalSubtitle}>
              {eraTitle}, {countryName}
            </div>
            <div className={styles.statusNote}>
              {isPending
                ? "Nano Banana가 대표 사진과 여행기를 정리하는 중…"
                : "결과 페이지로 이동하는 중…"}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.phase}>
              <div className={styles.phaseNumber}>
                PHASE {currentPhase.number} / 04
              </div>
              <div className={styles.phaseTitle}>{currentPhase.title}</div>
              <div className={styles.phaseDescription}>
                {currentPhase.description}
              </div>
            </div>

            <div className={styles.progress}>
              <div
                className={styles.progressBar}
                style={{
                  width: `${((phaseIndex + 1) / PHASES.length) * 100}%`,
                }}
              />
            </div>

            <div className={styles.coordinates}>
              <div>
                <span>LAT</span>
                {formatCoordinate(latitude, "S", "N")}
              </div>
              <div>
                <span>LNG</span>
                {formatCoordinate(longitude, "W", "E")}
              </div>
              <div>
                <span>YEAR</span>
                {eraLabel}
              </div>
              <div>
                <span>ERA</span>
                {eraTitle}
              </div>
            </div>
            <div className={styles.statusNote}>
              {isPending
                ? "AI가 이 시대의 대표 장면과 짧은 일기를 생성하는 중…"
                : "출발 신호를 준비하는 중…"}
            </div>
          </>
        )}
      </div>

      <Link href="/time-machine" className={styles.cancelButton}>
        ✕ 취소
      </Link>
    </div>
  );
}
