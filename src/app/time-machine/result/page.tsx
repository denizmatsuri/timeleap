import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DepartureScreen from "@/app/time-machine/result/_components/departure-screen";
import type { DestinationCountry } from "@/app/time-machine/_data/time-machine-destinations";
import {
  readQueryValue,
  resolveDestinationSelection,
} from "@/lib/time-machine/destination";

export const metadata: Metadata = {
  title: "Departure — Timeleap",
  description: "선택한 좌표로 이동하는 Timeleap 중간 로딩 화면",
};

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
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResultPageProps = {
  searchParams: Promise<{
    country?: string | string[];
    era?: string | string[];
    requestId?: string | string[];
  }>;
};

function readGenerationRequestId(value: string | string[] | undefined) {
  const requestId = readQueryValue(value);

  if (!requestId || !UUID_PATTERN.test(requestId)) {
    return null;
  }

  return requestId;
}

export default async function TimeMachineResultPage({
  searchParams,
}: ResultPageProps) {
  const resolvedSearchParams = await searchParams;
  const generationRequestId = readGenerationRequestId(
    resolvedSearchParams.requestId,
  );

  if (!generationRequestId) {
    redirect("/time-machine");
  }

  const { country, era } = resolveDestinationSelection({
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
      generationRequestId={generationRequestId}
      latitude={coordinates.lat}
      longitude={coordinates.lng}
    />
  );
}
