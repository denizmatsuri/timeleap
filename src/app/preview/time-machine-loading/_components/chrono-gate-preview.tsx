"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ChronoProfilePhoto from "@/app/time-machine/_components/chrono-profile-photo";
import styles from "@/app/preview/time-machine-loading/_components/chrono-gate-preview.module.css";

const TRANSMISSION_INTERVAL_MS = 2700;

type SignalSection = "arrival" | "start" | "wait";

type ChronoSignal = {
  detail: string;
  section: SignalSection;
  title: string;
};

const SECTION_LABELS: Record<SignalSection, string> = {
  arrival: "ARRIVAL",
  start: "START",
  wait: "FIELD",
};

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

const ARRIVAL_SIGNALS: readonly ChronoSignal[] = [
  {
    detail: "1977년 뉴욕 상공 300m. 도시의 네온이 보이기 시작합니다.",
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
] as const;

const WAIT_SIGNALS: readonly ChronoSignal[] = [
  {
    detail: "택시 경적, 젖은 아스팔트 냄새, 클럽의 저음에 몸을 맞춥니다.",
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
    detail: "노란 택시들이 지나가는 틈에 몸을 숨깁니다.",
    section: "wait",
    title: "택시 경적 사이로 숨어드는 중",
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
    detail: "클럽 문 앞의 줄이 길어집니다. 과거의 밤이 본격적으로 시작됩니다.",
    section: "wait",
    title: "네온 간판 아래 대기 중",
  },
] as const;

const SCAN_ROWS = [
  ["LAT", "40.71°N"],
  ["LNG", "74.00°W"],
  ["ERA", "1977"],
  ["DEST", "NEW YORK"],
] as const;

const DOSSIER_ROWS = [
  ["도착지", "1977 New York"],
  ["세계관", "Disco Night"],
  ["입국권", "Time Visa"],
] as const;

const OUTPUT_ITEMS = ["현지 사진", "하루 기록", "입국 도장"] as const;

type ChronoGatePreviewProps = {
  profilePhotoUrls: string[];
};

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

export default function ChronoGatePreview({
  profilePhotoUrls,
}: ChronoGatePreviewProps) {
  const [currentSignal, setCurrentSignal] = useState<ChronoSignal>(
    START_SIGNALS[0],
  );
  const [hasArrived, setHasArrived] = useState(false);
  const [signalTick, setSignalTick] = useState(0);

  useEffect(() => {
    let step = 0;
    let previousWaitTitle: string | undefined;

    const setNextSignal = () => {
      if (step === 0) {
        setCurrentSignal(pickRandomSignal(START_SIGNALS));
        setHasArrived(false);
      } else if (step === 1) {
        setCurrentSignal(pickRandomSignal(ARRIVAL_SIGNALS));
        setHasArrived(false);
      } else {
        const nextSignal = pickRandomSignal(WAIT_SIGNALS, previousWaitTitle);

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
  }, []);

  return (
    <main
      className={styles.preview}
      data-arriving={hasArrived ? "true" : undefined}
      data-signal-section={currentSignal.section}
    >
      <div className={styles.paperNoise} />
      <div className={styles.starField} />
      <div className={styles.timeBands} />

      <header className={styles.topBar}>
        <Link href="/time-machine" className={styles.exitLink}>
          닫기
        </Link>
      </header>

      <section className={styles.stage} aria-label="타임머신 로딩 디자인 미리보기">
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
            {SCAN_ROWS.map(([label, value]) => (
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
                  <span className={styles.eraMark}>🪩</span>
                  <span className={styles.yearMark}>1977</span>
                </div>
              </div>
            </div>
            <div className={styles.arrivalStamp} aria-hidden="true">
              <span>ARRIVED</span>
              <strong>1977 · USA</strong>
            </div>
          </div>

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
        </div>

        <aside className={`${styles.console} ${styles.rightConsole}`}>
          <div className={styles.consoleLabel}>ARRIVAL DOSSIER</div>
          <div className={styles.dossierHero}>
            <span>현장 기록서</span>
            <strong>과거에 직접 진입하는 중</strong>
          </div>
          <div className={styles.dossierList}>
            {DOSSIER_ROWS.map(([label, value]) => (
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
            <strong>SEOUL → 1977 NEW YORK</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
