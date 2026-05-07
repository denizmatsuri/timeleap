import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DepartureScreen from "@/app/time-machine/result/_components/departure-screen";
import {
  readQueryValue,
  resolveDestinationSelection,
} from "@/lib/time-machine/destination";
import { getDestinationCountryCoordinates } from "@/lib/time-machine/geo";
import { getEraEmoji } from "@/lib/time-machine/presentation";

export const metadata: Metadata = {
  title: "Departure — Timeleap",
  description: "선택한 좌표로 이동하는 Timeleap 중간 로딩 화면",
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
  const coordinates = getDestinationCountryCoordinates(country.code);

  return (
    <DepartureScreen
      countryCode={country.code}
      countryFlag={country.flag}
      countryName={country.name}
      eraEmoji={getEraEmoji(era.id)}
      eraId={era.id}
      eraLabel={era.year}
      eraTitle={era.title}
      generationRequestId={generationRequestId}
      latitude={coordinates.lat}
      longitude={coordinates.lng}
    />
  );
}
