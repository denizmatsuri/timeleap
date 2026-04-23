import type { Metadata } from "next";
import DepartureScreen from "@/app/time-machine/result/_components/departure-screen";
import {
  DESTINATION_COUNTRIES,
  type DestinationCountry,
} from "@/app/time-machine/_data/time-machine-destinations";

export const metadata: Metadata = {
  title: "Departure — Timeleap",
  description: "선택한 좌표로 이동하는 Timeleap 중간 로딩 화면",
};

const DEFAULT_COUNTRY =
  DESTINATION_COUNTRIES.find((country) => country.code === "US") ??
  DESTINATION_COUNTRIES[0];

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

type ResultPageProps = {
  searchParams: Promise<{
    country?: string | string[];
    era?: string | string[];
  }>;
};

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isDestinationCountryCode(
  value: string | undefined,
): value is DestinationCountry["code"] {
  if (!value) {
    return false;
  }

  return DESTINATION_COUNTRIES.some((country) => country.code === value);
}

function resolveDestination({
  countryCode,
  eraId,
}: {
  countryCode?: string;
  eraId?: string;
}) {
  if (eraId) {
    const matchedCountry = DESTINATION_COUNTRIES.find((country) =>
      country.eras.some((era) => era.id === eraId),
    );

    if (matchedCountry) {
      const matchedEra = matchedCountry.eras.find((era) => era.id === eraId);

      if (matchedEra) {
        return {
          country: matchedCountry,
          era: matchedEra,
        };
      }
    }
  }

  if (isDestinationCountryCode(countryCode)) {
    const matchedCountry = DESTINATION_COUNTRIES.find(
      (country) => country.code === countryCode,
    );

    if (matchedCountry) {
      return {
        country: matchedCountry,
        era: matchedCountry.eras[0],
      };
    }
  }

  return {
    country: DEFAULT_COUNTRY,
    era: DEFAULT_COUNTRY.eras[0],
  };
}

export default async function TimeMachineResultPage({
  searchParams,
}: ResultPageProps) {
  const resolvedSearchParams = await searchParams;
  const { country, era } = resolveDestination({
    countryCode: readQueryValue(resolvedSearchParams.country),
    eraId: readQueryValue(resolvedSearchParams.era),
  });
  const coordinates = COUNTRY_COORDINATES[country.code];

  return (
    <DepartureScreen
      countryCode={country.code}
      countryFlag={country.flag}
      countryName={country.name}
      eraEmoji={ERA_EMOJI_BY_ID[era.id] ?? "✦"}
      eraId={era.id}
      eraLabel={era.year}
      eraTitle={era.title}
      latitude={coordinates.lat}
      longitude={coordinates.lng}
    />
  );
}
