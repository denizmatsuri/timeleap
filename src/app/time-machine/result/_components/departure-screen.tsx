"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateDiaryFromSelection,
  getDiaryGenerationStatus,
} from "@/actions/time-machine";
import ChronoProfilePhoto from "@/app/time-machine/_components/chrono-profile-photo";
import styles from "@/app/time-machine/result/_components/departure-screen.module.css";

const REDIRECT_DELAY_MS = 3000;
const STATUS_POLL_INTERVAL_MS = 2000;
const STATUS_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const TRANSMISSION_INTERVAL_MS = 2700;

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
  profilePhotoUrls: string[];
};

type SignalSection = "arrival" | "start" | "wait";

type ChronoSignal = {
  detail: string;
  section: SignalSection;
  title: string;
};

type GenerationFlowInput = {
  countryCode: string;
  eraId: string;
  generationRequestId: string;
};

type GenerationFlowResult = {
  diaryId: string;
};

const SECTION_LABELS: Record<SignalSection, string> = {
  arrival: "ARRIVAL",
  start: "START",
  wait: "FIELD",
};

const OUTPUT_ITEMS = ["현지 사진", "하루 기록", "입국 도장"] as const;

const START_SIGNALS: readonly ChronoSignal[] = [
  {
    detail: "현재 시간대의 신호가 흔들립니다. 손잡이를 놓지 마세요.",
    section: "start",
    title: "디지털 난기류 진입",
  },
  {
    detail: "시간막이 열립니다. 시야가 잠시 하얗게 번집니다.",
    section: "start",
    title: "게이트 압력 상승",
  },
  {
    detail: "발밑의 시간이 느슨해집니다. 곧 현재가 뒤로 밀려납니다.",
    section: "start",
    title: "현재 좌표 분리",
  },
  {
    detail: "출발음이 들리면 숨을 짧게 들이마시세요.",
    section: "start",
    title: "시간 안전벨트 잠금",
  },
  {
    detail: "목표 시대의 틈이 열립니다. 흔들림에 대비하세요.",
    section: "start",
    title: "연대 진입각 조정",
  },
] as const;

function formatCoordinate(
  value: number,
  negativeSuffix: string,
  positiveSuffix: string,
) {
  return `${Math.abs(value).toFixed(2)}°${value < 0 ? negativeSuffix : positiveSuffix}`;
}

function pickRandomSignal(
  signals: readonly ChronoSignal[],
  previousTitle?: string,
) {
  if (signals.length === 1) {
    return signals[0];
  }

  let nextIndex = Math.floor(Math.random() * signals.length);
  const previousIndex = previousTitle
    ? signals.findIndex((signal) => signal.title === previousTitle)
    : -1;

  if (previousIndex >= 0 && nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % signals.length;
  }

  return signals[nextIndex];
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
  profilePhotoUrls,
}: DepartureScreenProps) {
  const router = useRouter();
  const generationPromiseRef = useRef<Promise<GenerationFlowResult> | null>(
    null,
  );
  const generationRequestIdRef = useRef(generationRequestId);
  const [currentSignal, setCurrentSignal] = useState<ChronoSignal>(
    START_SIGNALS[0],
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [signalTick, setSignalTick] = useState(0);
  const [, startTransition] = useTransition();

  const arrivalSignals = useMemo<readonly ChronoSignal[]>(
    () => [
      {
        detail: `${eraLabel} ${countryName} 상공. 목적지의 빛이 보이기 시작합니다.`,
        section: "arrival",
        title: "과거 좌표로 낙하 중",
      },
      {
        detail: "낯선 거리의 소음이 현재 시간보다 먼저 도착했습니다.",
        section: "arrival",
        title: "시대 경계 통과",
      },
      {
        detail: "발밑의 중력이 과거의 속도로 다시 맞춰집니다.",
        section: "arrival",
        title: "현지 중력 재접속",
      },
      {
        detail: "입국 도장이 찍혔습니다. 이제 당신의 과거 하루가 시작됩니다.",
        section: "arrival",
        title: "과거에 도착",
      },
    ],
    [countryName, eraLabel],
  );

  const waitSignals = useMemo<readonly ChronoSignal[]>(
    () => [
      {
        detail: "택시 경적, 젖은 아스팔트 냄새, 거리의 저음에 몸을 맞춥니다.",
        section: "wait",
        title: "현지 공기와 동기화",
      },
      {
        detail: "너무 현대적인 움직임이 감지됐습니다. 잠시 표정을 낮춥니다.",
        section: "wait",
        title: "시대착오 노출 회피",
      },
      {
        detail: "골목 끝의 낯선 이들이 이쪽을 봅니다. 반대편으로 뛰어갑니다.",
        section: "wait",
        title: "낯선 이들에게 쫓기는 중",
      },
      {
        detail: "유리창에 비친 옷차림을 확인하고 현지인처럼 자세를 고칩니다.",
        section: "wait",
        title: "현지 복장 스캔 중",
      },
      {
        detail: "큰길은 위험합니다. 불 꺼진 간판 아래로 조용히 이동합니다.",
        section: "wait",
        title: "뒷골목으로 이동 중",
      },
      {
        detail: `${countryName}의 거리 사이로 몸을 숨깁니다. 아직 누구도 눈치채면 안 됩니다.`,
        section: "wait",
        title: "현지 시선 회피 중",
      },
      {
        detail: "누군가 계속 뒤돌아봅니다. 지도는 접고 자연스럽게 걷습니다.",
        section: "wait",
        title: "의심스러운 시선 회피 중",
      },
      {
        detail: "빛이 충분합니다. 이 거리에서 첫 장면을 남길 수 있습니다.",
        section: "wait",
        title: "첫 사진 촬영 지점 탐색 중",
      },
      {
        detail: "문장 끝을 조금 낮추고, 현지 사람들의 말투를 따라갑니다.",
        section: "wait",
        title: "현지 억양 맞추는 중",
      },
      {
        detail: `${eraTitle}의 밤이 본격적으로 시작됩니다. 조금 더 현장에 머무릅니다.`,
        section: "wait",
        title: "네온 간판 아래 대기 중",
      },
    ],
    [countryName, eraTitle],
  );

  const scanRows = useMemo(
    () =>
      [
        ["LAT", formatCoordinate(latitude, "S", "N")],
        ["LNG", formatCoordinate(longitude, "W", "E")],
        ["ERA", eraLabel],
        ["DEST", countryName],
      ] as const,
    [countryName, eraLabel, latitude, longitude],
  );

  const dossierRows = useMemo(
    () =>
      [
        ["도착지", `${eraLabel} ${countryName}`],
        ["시대", eraTitle],
        ["입국권", "Time Visa"],
      ] as const,
    [countryName, eraLabel, eraTitle],
  );

  useEffect(() => {
    let step = 0;
    let previousWaitTitle: string | undefined;

    const setNextSignal = () => {
      if (step === 0) {
        setCurrentSignal(pickRandomSignal(START_SIGNALS));
        setHasArrived(false);
      } else if (step === 1) {
        setCurrentSignal(pickRandomSignal(arrivalSignals));
        setHasArrived(false);
      } else {
        const nextSignal = pickRandomSignal(waitSignals, previousWaitTitle);

        previousWaitTitle = nextSignal.title;
        setCurrentSignal(nextSignal);
        setHasArrived(true);
      }

      setSignalTick((currentValue) => currentValue + 1);
      step += 1;
    };

    setNextSignal();

    const transmissionTimer = window.setInterval(
      setNextSignal,
      TRANSMISSION_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(transmissionTimer);
    };
  }, [arrivalSignals, generationRequestId, retryCount, waitSignals]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
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

  const handleRetryGeneration = () => {
    setGenerationError(null);
    setHasArrived(false);
    setCurrentSignal(START_SIGNALS[0]);
    setRetryCount((currentValue) => currentValue + 1);
  };

  return (
    <main
      className={styles.departure}
      data-arriving={hasArrived ? "true" : undefined}
      data-signal-section={currentSignal.section}
    >
      <div className={styles.paperNoise} />
      <div className={styles.starField} />
      <div className={styles.timeBands} />

      <header className={styles.topBar}>
        <Link href="/time-machine" className={styles.exitLink}>
          취소
        </Link>
      </header>

      <section className={styles.stage} aria-label="타임머신 대기 화면">
        <aside className={`${styles.console} ${styles.leftConsole}`}>
          <div className={styles.consoleLabel}>PASSPORT LOCK</div>
          <div className={styles.identityCard}>
            <ChronoProfilePhoto imageUrls={profilePhotoUrls} />
            <div className={styles.identityCopy}>
              <span>TRAVELER</span>
              <strong>TIMELEAP USER</strong>
            </div>
          </div>
          <div className={styles.scanGrid}>
            {scanRows.map(([label, value]) => (
              <div key={label} className={styles.scanRow}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </aside>

        <div className={styles.gateColumn}>
          <div className={styles.gateShell}>
            <div className={styles.portalGlow} />
            <div className={`${styles.orbit} orbit-one`} />
            <div className={`${styles.orbit} orbit-two`} />
            <div className={`${styles.orbit} orbit-three`} />
            <div className={styles.gate}>
              <span className={styles.minuteTicks} />
              <span className={styles.outerDial} />
              <span className={styles.innerDial} />
              <span className={styles.depthDial} />
              <span className={styles.gateNeedle} />
              <div className={styles.portalWindow}>
                <div className={styles.portalCore}>
                  <span className={styles.eraMark}>{eraEmoji}</span>
                  <span className={styles.yearMark}>{eraLabel}</span>
                </div>
              </div>
            </div>
            <div className={styles.arrivalStamp} aria-hidden="true">
              <span>ARRIVED</span>
              <strong>
                {eraLabel} · {countryFlag} {countryName}
              </strong>
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
                  onClick={handleRetryGeneration}
                >
                  다시 생성하기
                </button>
                <Link href="/time-machine" className={styles.secondaryButton}>
                  좌표 다시 고르기
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div
                key={`${currentSignal.section}-${signalTick}`}
                className={styles.transmissionCopy}
              >
                <div className={styles.transmissionEyebrow}>
                  LIVE CHRONO SIGNAL · {SECTION_LABELS[currentSignal.section]}
                </div>
                <h1>{currentSignal.title}</h1>
                <p>{currentSignal.detail}</p>
              </div>

              <div className={styles.signalTrack} aria-hidden="true">
                <span className={styles.signalPulse} />
              </div>
            </>
          )}
        </div>

        <aside className={`${styles.console} ${styles.rightConsole}`}>
          <div className={styles.consoleLabel}>ARRIVAL DOSSIER</div>
          <div className={styles.dossierHero}>
            <span>현장 기록서</span>
            <strong>과거에 직접 진입하는 중</strong>
          </div>
          <div className={styles.dossierList}>
            {dossierRows.map(([label, value]) => (
              <div key={label} className={styles.dossierRow}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className={styles.outputList} aria-label="현지 확보 예정 기록">
            {OUTPUT_ITEMS.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className={styles.ticketStub}>
            <span>BOARDING PASS</span>
            <strong>
              TIMELEAP → {eraLabel} {countryName}
            </strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
