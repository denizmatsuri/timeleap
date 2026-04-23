"use client";

import dynamic from "next/dynamic";

const TimeMachineStudio = dynamic(
  () => import("@/app/time-machine/_components/time-machine-studio"),
  {
    ssr: false,
  },
);

export default function TimeMachineClient() {
  return <TimeMachineStudio />;
}
