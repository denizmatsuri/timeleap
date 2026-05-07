"use client";

import dynamic from "next/dynamic";
import type { DestinationCountry } from "@/lib/time-machine/destinations";

type TimeMachineClientProps = {
  initialCountryCode: DestinationCountry["code"];
  initialEraId: string;
};

const TimeMachineStudio = dynamic<TimeMachineClientProps>(
  () => import("@/app/time-machine/_components/time-machine-studio"),
  {
    ssr: false,
  },
);

export default function TimeMachineClient({
  initialCountryCode,
  initialEraId,
}: TimeMachineClientProps) {
  return (
    <TimeMachineStudio
      initialCountryCode={initialCountryCode}
      initialEraId={initialEraId}
    />
  );
}
