"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DESTINATION_COUNTRIES,
  type DestinationCountry,
  type DestinationEra,
} from "@/lib/time-machine/destinations";
import styles from "@/app/time-machine/_components/time-machine-studio.module.css";

const CONTINENTS = [
  "M-145,55 L-130,62 L-125,65 L-110,68 L-95,65 L-85,55 L-80,40 L-75,28 L-82,18 L-95,15 L-105,20 L-115,30 L-125,40 L-140,45 Z",
  "M-75,-5 L-65,-10 L-55,-20 L-52,-35 L-58,-45 L-68,-48 L-75,-40 L-80,-25 L-82,-15 Z",
  "M-5,55 L10,58 L25,55 L30,45 L25,40 L10,42 L0,48 Z",
  "M-15,30 L5,32 L20,25 L30,10 L35,-10 L30,-28 L20,-35 L10,-30 L0,-15 L-10,0 L-15,15 Z",
  "M35,55 L55,60 L80,58 L110,55 L130,48 L140,40 L130,30 L115,25 L100,30 L80,25 L60,35 L45,40 L35,45 Z",
  "M60,25 L72,22 L78,15 L80,5 L75,0 L68,8 L62,18 Z",
  "M95,0 L115,-2 L125,-8 L115,-12 L100,-10 Z",
  "M115,-25 L140,-22 L148,-30 L142,-40 L125,-42 L115,-35 Z",
  "M-45,70 L-30,75 L-20,72 L-25,62 L-40,60 Z",
] as const;

const COUNTRY_COORDINATES: Record<
  DestinationCountry["code"],
  { lat: number; lng: number }
> = {
  FR: { lat: 46, lng: 2 },
  GB: { lat: 54, lng: -2 },
  JP: { lat: 36, lng: 138 },
  KR: { lat: 36, lng: 128 },
  MX: { lat: 23, lng: -102 },
  US: { lat: 39, lng: -97 },
};

const ERA_EMOJI_BY_ID: Record<string, string> = {
  "fr-belle-epoque": "🥂",
  "fr-riviera": "☀️",
  "gb-punk": "⚡",
  "gb-victorian": "🕯️",
  "jp-bubble": "🥃",
  "jp-taisho": "🎐",
  "jp-tokyo64": "🚄",
  "kr-gyeongseong": "🎩",
  "kr-sewoon": "📻",
  "kr-myeongdong": "📷",
  "kr-olympic": "🏟️",
  "mx-acapulco": "🌴",
  "mx-coyoacan": "🌵",
  "mx-fiesta": "🎉",
  "mx-golden-age": "🎭",
  "us-disco": "🪩",
  "us-drive-in": "🚗",
  "us-harlem": "🎷",
};

const PARALLELS = [-60, -30, 0, 30, 60] as const;
const MERIDIANS = [
  -180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150,
] as const;

const SIZE = 460;
const CENTER_X = 230;
const CENTER_Y = 230;
const RADIUS = 210;
const ROTATE_LAT = 12;
const INITIAL_ROTATE_LNG = -60;
const AUTO_ROTATE_SPEED = 0.15;

const CONTINENT_POINTS = CONTINENTS.map(parsePath);
const INITIAL_COUNTRY =
  DESTINATION_COUNTRIES.find((country) => country.code === "US") ??
  DESTINATION_COUNTRIES[0];

type ProjectedPoint = {
  depth: number;
  x: number;
  y: number;
};

type GlobeMarker = {
  country: DestinationCountry;
  point: ProjectedPoint;
  scale: number;
};

function parsePath(pathDefinition: string): Array<[number, number]> {
  const numbers = pathDefinition.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const points: Array<[number, number]> = [];

  for (let index = 0; index < numbers.length; index += 2) {
    points.push([Number(numbers[index]), Number(numbers[index + 1])]);
  }

  return points;
}

function project(
  lat: number,
  lng: number,
  rotateLng: number,
  rotateLat = 0,
  radius = 150,
): ProjectedPoint | null {
  const lambda = ((lng - rotateLng) * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const phiZero = (rotateLat * Math.PI) / 180;
  const cosC =
    Math.sin(phiZero) * Math.sin(phi) +
    Math.cos(phiZero) * Math.cos(phi) * Math.cos(lambda);

  if (cosC < 0) {
    return null;
  }

  return {
    depth: cosC,
    x: radius * Math.cos(phi) * Math.sin(lambda),
    y:
      radius *
      (Math.cos(phiZero) * Math.sin(phi) -
        Math.sin(phiZero) * Math.cos(phi) * Math.cos(lambda)),
  };
}

function normalizeRotation(value: number) {
  let normalized = value % 360;

  if (normalized > 180) {
    normalized -= 360;
  }

  if (normalized < -180) {
    normalized += 360;
  }

  return normalized;
}

function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export default function TimeMachineStudio() {
  const router = useRouter();
  const [selectedCountryCode, setSelectedCountryCode] = useState<
    DestinationCountry["code"]
  >(INITIAL_COUNTRY.code);
  const [selectedEraId, setSelectedEraId] = useState<string>(
    INITIAL_COUNTRY.eras[0].id,
  );
  const [rotateLng, setRotateLng] = useState(INITIAL_ROTATE_LNG);
  const [isDragging, setIsDragging] = useState(false);

  const rotateLngRef = useRef(rotateLng);
  const autoRotateRef = useRef(true);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartLngRef = useRef(INITIAL_ROTATE_LNG);
  const randomSeedRef = useRef(123456789);
  const autoRotateTimeoutRef = useRef<number | null>(null);
  const autoRotateFrameRef = useRef<number | null>(null);
  const rotateFrameRef = useRef<number | null>(null);

  const activeCountry =
    DESTINATION_COUNTRIES.find(
      (country) => country.code === selectedCountryCode,
    ) ?? INITIAL_COUNTRY;
  const activeEra =
    activeCountry.eras.find((era) => era.id === selectedEraId) ??
    activeCountry.eras[0];
  const activeEraEmoji = ERA_EMOJI_BY_ID[activeEra.id] ?? "✦";

  const handleDepartTimeMachine = () => {
    const searchParams = new URLSearchParams({
      country: activeCountry.code,
      era: activeEra.id,
      requestId: crypto.randomUUID(),
    });

    router.push(`/time-machine/result?${searchParams.toString()}`);
  };

  const clearAutoRotateResume = () => {
    if (autoRotateTimeoutRef.current !== null) {
      window.clearTimeout(autoRotateTimeoutRef.current);
      autoRotateTimeoutRef.current = null;
    }
  };

  const stopRotateAnimation = () => {
    if (rotateFrameRef.current !== null) {
      window.cancelAnimationFrame(rotateFrameRef.current);
      rotateFrameRef.current = null;
    }
  };

  const scheduleAutoRotateResume = (delayMs: number) => {
    clearAutoRotateResume();

    autoRotateTimeoutRef.current = window.setTimeout(() => {
      autoRotateRef.current = true;
      autoRotateTimeoutRef.current = null;
    }, delayMs);
  };

  useEffect(() => {
    rotateLngRef.current = rotateLng;
  }, [rotateLng]);

  useEffect(() => {
    const tick = () => {
      if (autoRotateRef.current && !draggingRef.current) {
        setRotateLng((currentValue) => currentValue + AUTO_ROTATE_SPEED);
      }

      autoRotateFrameRef.current = window.requestAnimationFrame(tick);
    };

    autoRotateFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      clearAutoRotateResume();
      stopRotateAnimation();

      if (autoRotateFrameRef.current !== null) {
        window.cancelAnimationFrame(autoRotateFrameRef.current);
      }
    };
  }, []);

  const animateRotateTo = (targetLng: number) => {
    stopRotateAnimation();
    clearAutoRotateResume();
    autoRotateRef.current = false;

    const start = window.performance.now();
    const from = normalizeRotation(rotateLngRef.current);
    let delta = targetLng - from;

    if (delta > 180) {
      delta -= 360;
    }

    if (delta < -180) {
      delta += 360;
    }

    const duration = 900;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;

      setRotateLng(from + delta * eased);

      if (progress < 1) {
        rotateFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      rotateFrameRef.current = null;
      scheduleAutoRotateResume(1800);
    };

    rotateFrameRef.current = window.requestAnimationFrame(animate);
  };

  const pickCountry = (countryCode: DestinationCountry["code"]) => {
    const nextCountry = DESTINATION_COUNTRIES.find(
      (country) => country.code === countryCode,
    );

    if (!nextCountry) {
      return;
    }

    setSelectedCountryCode(nextCountry.code);
    setSelectedEraId(nextCountry.eras[0].id);
    animateRotateTo(-COUNTRY_COORDINATES[nextCountry.code].lng);
  };

  const pickEra = (era: DestinationEra) => {
    setSelectedEraId(era.id);
  };

  const nextPseudoRandom = () => {
    randomSeedRef.current =
      (randomSeedRef.current * 1664525 + 1013904223) % 4294967296;

    return randomSeedRef.current / 4294967296;
  };

  const randomize = () => {
    const nextCountry =
      DESTINATION_COUNTRIES[
        Math.floor(nextPseudoRandom() * DESTINATION_COUNTRIES.length)
      ];
    const nextEra =
      nextCountry.eras[
        Math.floor(nextPseudoRandom() * nextCountry.eras.length)
      ];

    setSelectedCountryCode(nextCountry.code);
    setSelectedEraId(nextEra.id);
    animateRotateTo(-COUNTRY_COORDINATES[nextCountry.code].lng);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    setIsDragging(true);
    autoRotateRef.current = false;
    clearAutoRotateResume();
    stopRotateAnimation();
    dragStartXRef.current = event.clientX;
    dragStartLngRef.current = rotateLngRef.current;

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }

    setRotateLng(
      dragStartLngRef.current + (event.clientX - dragStartXRef.current) * 0.5,
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    scheduleAutoRotateResume(2000);
  };

  const globeGeometry = useMemo(() => {
    const parallels = PARALLELS.map((lat) => {
      const points: string[] = [];

      for (let lng = -180; lng <= 180; lng += 5) {
        const projectedPoint = project(lat, lng, rotateLng, ROTATE_LAT, RADIUS);

        if (projectedPoint) {
          points.push(
            `${CENTER_X + projectedPoint.x},${CENTER_Y - projectedPoint.y}`,
          );
        }
      }

      return points;
    }).filter((points) => points.length > 1);

    const meridians = MERIDIANS.map((lng) => {
      const points: string[] = [];

      for (let lat = -80; lat <= 80; lat += 5) {
        const projectedPoint = project(lat, lng, rotateLng, ROTATE_LAT, RADIUS);

        if (projectedPoint) {
          points.push(
            `${CENTER_X + projectedPoint.x},${CENTER_Y - projectedPoint.y}`,
          );
        }
      }

      return points;
    }).filter((points) => points.length > 1);

    const continents = CONTINENT_POINTS.map((continent) => {
      const projectedPoints = continent
        .map(([lng, lat]) => project(lat, lng, rotateLng, ROTATE_LAT, RADIUS))
        .filter((point): point is ProjectedPoint => point !== null);

      if (projectedPoints.length < 3) {
        return null;
      }

      return `${projectedPoints
        .map((point, index) => {
          return `${index === 0 ? "M" : "L"}${CENTER_X + point.x},${CENTER_Y - point.y}`;
        })
        .join(" ")} Z`;
    }).filter((path): path is string => path !== null);

    const markers: GlobeMarker[] = [];

    for (const country of DESTINATION_COUNTRIES) {
      const coordinates = COUNTRY_COORDINATES[country.code];
      const projectedPoint = project(
        coordinates.lat,
        coordinates.lng,
        rotateLng,
        ROTATE_LAT,
        RADIUS,
      );

      if (!projectedPoint) {
        continue;
      }

      markers.push({
        country,
        point: projectedPoint,
        scale: 0.6 + projectedPoint.depth * 0.4,
      });
    }

    markers.sort((firstMarker, secondMarker) => {
      return firstMarker.point.depth - secondMarker.point.depth;
    });

    return { continents, markers, meridians, parallels };
  }, [rotateLng]);

  return (
    <div className={cn(styles.timeMachine, "screen-in relative z-10")}>
      <div className={styles.tmCosmos}>
        <div className={styles.tmCosmosGlow} />
      </div>

      <div className={styles.tmLayout}>
        <section className={styles.tmGlobeWrap}>
          <div className={styles.tmGlobeLabel}>
            <span className={styles.tmLabelSmall}>SPATIAL</span>
            <span className={styles.tmLabelBig}>어디로 갈까요</span>
          </div>

          <div
            className={cn(
              styles.tmGlobeStage,
              isDragging && styles.tmGlobeStageDragging,
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className={styles.globeSvg}
              aria-label="회전하는 지구본"
            >
              <defs>
                <radialGradient id="tm-sphere" cx="35%" cy="30%">
                  <stop offset="0%" stopColor="#2d355e" />
                  <stop offset="60%" stopColor="#151a33" />
                  <stop offset="100%" stopColor="#0c0f1f" />
                </radialGradient>
                <radialGradient id="tm-glow">
                  <stop offset="60%" stopColor="#c9944a" stopOpacity="0" />
                  <stop offset="90%" stopColor="#c9944a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#c9944a" stopOpacity="0" />
                </radialGradient>
                <clipPath id="tm-sphere-clip">
                  <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS} />
                </clipPath>
              </defs>

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={RADIUS + 16}
                fill="url(#tm-glow)"
              />
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={RADIUS}
                fill="url(#tm-sphere)"
                stroke="#c9944a"
                strokeOpacity="0.4"
                strokeWidth="0.8"
              />

              <g clipPath="url(#tm-sphere-clip)" opacity="0.22">
                {globeGeometry.parallels.map((points, index) => (
                  <polyline
                    key={`parallel-${index}`}
                    points={points.join(" ")}
                    fill="none"
                    stroke="#c9944a"
                    strokeWidth="0.6"
                  />
                ))}
                {globeGeometry.meridians.map((points, index) => (
                  <polyline
                    key={`meridian-${index}`}
                    points={points.join(" ")}
                    fill="none"
                    stroke="#c9944a"
                    strokeWidth="0.6"
                  />
                ))}
              </g>

              <g clipPath="url(#tm-sphere-clip)">
                {globeGeometry.continents.map((path, index) => (
                  <path
                    key={`continent-${index}`}
                    d={path}
                    fill="#c9944a"
                    fillOpacity="0.85"
                    stroke="#e8c98a"
                    strokeOpacity="0.5"
                    strokeWidth="0.5"
                  />
                ))}
              </g>

              <g clipPath="url(#tm-sphere-clip)">
                {globeGeometry.markers.map(({ country, point, scale }) => {
                  const isSelected = selectedCountryCode === country.code;

                  return (
                    <g
                      key={country.code}
                      transform={`translate(${CENTER_X + point.x},${CENTER_Y - point.y})`}
                      onClick={() => pickCountry(country.code)}
                      className={styles.globeMarkerGroup}
                    >
                      {isSelected ? (
                        <circle
                          r={14 * scale}
                          fill="none"
                          stroke="#fdf6e3"
                          strokeWidth="1.5"
                          opacity="0.8"
                        >
                          <animate
                            attributeName="r"
                            from={8 * scale}
                            to={24 * scale}
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.8"
                            to="0"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      ) : null}

                      <circle
                        r={(isSelected ? 6 : 4) * scale}
                        className={styles.globeMarkerCore}
                        fill={isSelected ? "#fdf6e3" : "#d97f5a"}
                        stroke="#0c0f1f"
                        strokeWidth="1"
                      />

                      {point.depth > 0.5 ? (
                        <text
                          x="10"
                          y="4"
                          opacity={isSelected ? "1" : "0.65"}
                          className={styles.globeCode}
                        >
                          {country.code}
                        </text>
                      ) : null}

                      <circle r="16" fill="transparent" />
                    </g>
                  );
                })}
              </g>

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={RADIUS}
                fill="none"
                stroke="#0c0f1f"
                strokeWidth="1"
                opacity="0.8"
              />
              <ellipse
                cx={CENTER_X + RADIUS * 0.25}
                cy={CENTER_Y}
                rx={RADIUS * 0.85}
                ry={RADIUS}
                fill="#0c0f1f"
                opacity="0.18"
                clipPath="url(#tm-sphere-clip)"
              />
            </svg>
          </div>

          <div className={styles.tmGlobeHint}>
            🧭 드래그해서 지구를 돌리거나 점을 선택하세요
          </div>

          <div className={styles.countryPills}>
            {DESTINATION_COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                className={cn(
                  styles.countryPill,
                  selectedCountryCode === country.code &&
                    styles.countryPillActive,
                )}
                onClick={() => pickCountry(country.code)}
              >
                <span>{country.flag}</span>
                {country.name}
              </button>
            ))}
          </div>
        </section>

        <aside className={styles.tmSide}>
          <section className={styles.tmDestination}>
            <div className={styles.tmDestLabel}>DESTINATION</div>
            <div className={styles.tmDestBig}>
              <div className={styles.tmDestYear}>{activeEra.year}</div>
              <div className={styles.tmDestSlash}>/</div>
              <div className={styles.tmDestCountry}>
                <span className={styles.tmDestFlag}>{activeCountry.flag}</span>
                <span>{activeCountry.name}</span>
              </div>
            </div>
            <div className={styles.tmDestTitle}>
              <span className={styles.tmDestEmoji}>{activeEraEmoji}</span>
              {activeEra.title}
            </div>
            <div className={styles.tmDestBlurb}>{activeEra.blurb}</div>
          </section>

          <section className={styles.tmTimeline}>
            <div className={styles.tmLabelSmall}>TEMPORAL</div>
            <div className={styles.tmLabelBig}>언제로 갈까요</div>
            <div className={styles.timelineRailWrap}>
              <div className={styles.timelineRail}>
                {activeCountry.eras.map((era) => (
                  <button
                    key={era.id}
                    type="button"
                    className={cn(
                      styles.railNode,
                      era.id === activeEra.id && styles.railNodeActive,
                    )}
                    onClick={() => pickEra(era)}
                  >
                    <span className={styles.railDot} />
                    <span className={styles.railYear}>{era.year}</span>
                    <span className={styles.railEmoji}>
                      {ERA_EMOJI_BY_ID[era.id] ?? "✦"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.eraDetailCard}>
              <div className={styles.eraDetailHead}>
                <div className={styles.eraDetailYear}>{activeEra.year}</div>
                <div className={styles.eraDetailName}>{activeEra.title}</div>
              </div>
              <div className={styles.eraDetailBody}>{activeEra.headline}</div>
              <div className={styles.eraDetailTags}>
                <span className={styles.chip}>{activeCountry.name}</span>
                <span className={styles.chip}>{activeEra.city}</span>
                <span className={styles.chip}>{activeEra.mood}</span>
              </div>
            </div>
          </section>

          <div className={styles.tmActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={randomize}
            >
              🎲 랜덤 좌표
            </button>
            <button
              type="button"
              className={styles.departBtn}
              onClick={handleDepartTimeMachine}
            >
              ✦ 출발
            </button>
          </div>

          <div className={styles.tmMeta}>
            <div>
              예상 소요시간 · <strong>30–60초</strong>
            </div>
            <div>
              결과물 · <strong>사진 + 일기</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
