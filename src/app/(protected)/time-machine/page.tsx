import type { Metadata } from "next";
import TimeMachineClient from "@/app/time-machine/_components/time-machine-client";
import {
  readQueryValue,
  resolveDestinationSelection,
} from "@/lib/time-machine/destination";

export const metadata: Metadata = {
  title: "Time Machine Atlas — Timeleap",
  description: "Timeleap 타임머신을 타고 세계 여행을 떠나보세요.",
};

type TimeMachinePageProps = {
  searchParams: Promise<{
    country?: string | string[];
    era?: string | string[];
  }>;
};

export default async function TimeMachinePage({
  searchParams,
}: TimeMachinePageProps) {
  const resolvedSearchParams = await searchParams;
  const { country, era } = resolveDestinationSelection({
    countryCode: readQueryValue(resolvedSearchParams.country),
    eraId: readQueryValue(resolvedSearchParams.era),
  });

  return (
    <TimeMachineClient initialCountryCode={country.code} initialEraId={era.id} />
  );
}
