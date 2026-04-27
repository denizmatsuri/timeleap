"use client";

import dynamic from "next/dynamic";

type TimeMachineClientProps = {
  showMyDiariesLink: boolean;
};

const TimeMachineStudio = dynamic(
  () => import("@/app/time-machine/_components/time-machine-studio"),
  {
    ssr: false,
  },
);

export default function TimeMachineClient({
  showMyDiariesLink,
}: TimeMachineClientProps) {
  return <TimeMachineStudio showMyDiariesLink={showMyDiariesLink} />;
}
