"use client";

import { geoDistance, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { feature, mesh } from "topojson-client";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiLineString,
} from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldTopologyJson from "world-atlas/countries-110m.json";
import {
  DEFAULT_DIARY_GENERATION_MODEL_ID,
  DIARY_GENERATION_MODELS,
} from "@/lib/ai/generation-models";
import {
  DESTINATION_COUNTRIES,
  type DestinationCountry,
  type DestinationEra,
} from "@/lib/time-machine/destinations";
import { resolveDestinationSelection } from "@/lib/time-machine/destination";
import {
  DESTINATION_COUNTRY_COORDINATES,
  getDestinationCountryCoordinates,
} from "@/lib/time-machine/geo";
import { getEraEmoji } from "@/lib/time-machine/presentation";
import styles from "@/app/time-machine/_components/time-machine-studio.module.css";

const COUNTRY_TOPOLOGY_ID_BY_CODE: Record<DestinationCountry["code"], string> =
  {
    EG: "818",
    FR: "250",
    GB: "826",
    IN: "356",
    JP: "392",
    KR: "410",
    MX: "484",
    TR: "792",
    US: "840",
  };

const SIZE = 460;
const CENTER_X = 230;
const CENTER_Y = 230;
const RADIUS = 210;
const ROTATE_LAT = 12;
const AUTO_ROTATE_SPEED = 0.15;

const INITIAL_COUNTRY =
  DESTINATION_COUNTRIES.find((country) => country.code === "US") ??
  DESTINATION_COUNTRIES[0];

type WorldTopology = Topology<{
  countries: GeometryCollection<{ name: string }>;
  land: GeometryCollection;
}>;

const WORLD_TOPOLOGY = worldTopologyJson as WorldTopology;
const WORLD_LAND = feature(
  WORLD_TOPOLOGY,
  WORLD_TOPOLOGY.objects.land,
) as FeatureCollection<Geometry>;
const WORLD_COUNTRY_BORDERS = mesh(
  WORLD_TOPOLOGY,
  WORLD_TOPOLOGY.objects.countries,
  (firstCountry, secondCountry) => firstCountry !== secondCountry,
) as MultiLineString;
const WORLD_GRATICULE = geoGraticule().step([30, 30])();
const DESTINATION_COUNTRY_FEATURES = DESTINATION_COUNTRIES.map((country) => {
  const countryGeometry = WORLD_TOPOLOGY.objects.countries.geometries.find(
    (geometry) =>
      String(geometry.id) === COUNTRY_TOPOLOGY_ID_BY_CODE[country.code],
  );

  if (!countryGeometry) {
    throw new Error(`Missing globe geometry for ${country.code}`);
  }

  return {
    country,
    feature: feature(WORLD_TOPOLOGY, countryGeometry) as Feature<Geometry>,
  };
});

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

type TimeMachineStudioProps = {
  initialCountryCode: DestinationCountry["code"];
  initialEraId: string;
};

function getMarkerDepth({
  lat,
  lng,
  rotateLng,
}: {
  lat: number;
  lng: number;
  rotateLng: number;
}) {
  const angularDistance = geoDistance([-rotateLng, ROTATE_LAT], [lng, lat]);
  const depth = Math.cos(angularDistance);

  if (depth <= 0) {
    return null;
  }

  return depth;
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

export default function TimeMachineStudio({
  initialCountryCode,
  initialEraId,
}: TimeMachineStudioProps) {
  const router = useRouter();
  const initialDestination = resolveDestinationSelection({
    countryCode: initialCountryCode,
    eraId: initialEraId,
  });
  const initialRotateLng = -getDestinationCountryCoordinates(
    initialDestination.country.code,
  ).lng;
  const [selectedCountryCode, setSelectedCountryCode] = useState<
    DestinationCountry["code"]
  >(initialDestination.country.code);
  const [selectedEraId, setSelectedEraId] = useState<string>(
    initialDestination.era.id,
  );
  const [selectedGenerationModelId, setSelectedGenerationModelId] = useState(
    DEFAULT_DIARY_GENERATION_MODEL_ID,
  );
  const [rotateLng, setRotateLng] = useState(initialRotateLng);
  const [isDragging, setIsDragging] = useState(false);

  const rotateLngRef = useRef(rotateLng);
  const autoRotateRef = useRef(true);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartLngRef = useRef(initialRotateLng);
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
  const activeEraEmoji = getEraEmoji(activeEra.id);
  const activeGenerationModel =
    DIARY_GENERATION_MODELS.find((generationModel) => {
      return generationModel.id === selectedGenerationModelId;
    }) ?? DIARY_GENERATION_MODELS[0];

  const handleDepartTimeMachine = () => {
    const searchParams = new URLSearchParams({
      country: activeCountry.code,
      era: activeEra.id,
      model: activeGenerationModel.id,
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
    animateRotateTo(-getDestinationCountryCoordinates(nextCountry.code).lng);
  };

  const pickEra = (era: DestinationEra) => {
    setSelectedEraId(era.id);
  };

  const handleCountryClick = (
    event: ReactMouseEvent<SVGElement>,
    countryCode: DestinationCountry["code"],
  ) => {
    event.stopPropagation();
    pickCountry(countryCode);
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
    animateRotateTo(-getDestinationCountryCoordinates(nextCountry.code).lng);
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
    const projection = geoOrthographic()
      .scale(RADIUS)
      .translate([CENTER_X, CENTER_Y])
      .rotate([rotateLng, -ROTATE_LAT])
      .clipAngle(90);
    const path = geoPath(projection).digits(1);

    const markers: GlobeMarker[] = [];

    for (const country of DESTINATION_COUNTRIES) {
      const coordinates = DESTINATION_COUNTRY_COORDINATES[country.code];
      const depth = getMarkerDepth({
        lat: coordinates.lat,
        lng: coordinates.lng,
        rotateLng,
      });

      if (depth === null) {
        continue;
      }

      const point = projection([coordinates.lng, coordinates.lat]);

      if (!point) {
        continue;
      }

      markers.push({
        country,
        point: {
          depth,
          x: point[0],
          y: point[1],
        },
        scale: 0.6 + depth * 0.4,
      });
    }

    markers.sort((firstMarker, secondMarker) => {
      return firstMarker.point.depth - secondMarker.point.depth;
    });

    const destinationCountries = DESTINATION_COUNTRY_FEATURES.map(
      ({ country, feature: countryFeature }) => ({
        country,
        path: path(countryFeature) ?? "",
      }),
    ).filter(({ path: countryPath }) => countryPath.length > 0);

    return {
      borderPath: path(WORLD_COUNTRY_BORDERS) ?? "",
      destinationCountries,
      graticulePath: path(WORLD_GRATICULE) ?? "",
      landPath: path(WORLD_LAND) ?? "",
      markers,
    };
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
                <path
                  d={globeGeometry.graticulePath}
                  fill="none"
                  stroke="#c9944a"
                  strokeWidth="0.6"
                />
              </g>

              <g clipPath="url(#tm-sphere-clip)">
                <path
                  d={globeGeometry.landPath}
                  fill="#c9944a"
                  fillOpacity="0.82"
                  stroke="#e8c98a"
                  strokeOpacity="0.45"
                  strokeWidth="0.5"
                />
                <path
                  d={globeGeometry.borderPath}
                  fill="none"
                  stroke="#f2d79b"
                  strokeOpacity="0.24"
                  strokeWidth="0.45"
                />
                {globeGeometry.destinationCountries.map(({ country, path }) => (
                  <path
                    key={country.code}
                    d={path}
                    className={cn(
                      styles.globeCountryPath,
                      selectedCountryCode === country.code &&
                        styles.globeCountryPathActive,
                    )}
                    fill="#fdf6e3"
                    stroke="#fdf6e3"
                    strokeWidth="0.9"
                    onClick={(event) => handleCountryClick(event, country.code)}
                    onPointerDown={(event) => event.stopPropagation()}
                  />
                ))}
              </g>

              <g clipPath="url(#tm-sphere-clip)">
                {globeGeometry.markers.map(({ country, point, scale }) => {
                  const isSelected = selectedCountryCode === country.code;

                  return (
                    <g
                      key={country.code}
                      transform={`translate(${point.x},${point.y})`}
                      onClick={(event) =>
                        handleCountryClick(event, country.code)
                      }
                      onPointerDown={(event) => event.stopPropagation()}
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
            </svg>
          </div>

          <div className={styles.tmGlobeHint}>
            🧭 드래그해서 지구를 돌리거나 나라를 선택하세요
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
                      {getEraEmoji(era.id)}
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

          <section className={styles.tmCamera}>
            <div className={styles.tmLabelSmall}>CAMERA</div>
            <div className={styles.tmLabelBig}>어떤 카메라로 찍을까요</div>
            <div className={styles.cameraOptions}>
              {DIARY_GENERATION_MODELS.map((generationModel) => (
                <button
                  key={generationModel.id}
                  type="button"
                  className={cn(
                    styles.cameraOption,
                    generationModel.id === activeGenerationModel.id &&
                      styles.cameraOptionActive,
                  )}
                  onClick={() =>
                    setSelectedGenerationModelId(generationModel.id)
                  }
                >
                  <span className={styles.cameraName}>
                    {generationModel.label} 카메라
                  </span>
                  <span className={styles.cameraMeta}>
                    {generationModel.shortLabel} · {generationModel.note}
                  </span>
                </button>
              ))}
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
              예상 소요시간 ·{" "}
              <strong>{activeGenerationModel.durationLabel}</strong>
            </div>
            <div>
              카메라 · <strong>{activeGenerationModel.shortLabel}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
