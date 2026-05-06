import type { Metadata } from "next";
import TimeMachineClient from "@/app/time-machine/_components/time-machine-client";

export const metadata: Metadata = {
  title: "Time Machine Atlas — Timeleap",
  description: "Timeleap 타임머신을 타고 세계 여행을 떠나보세요.",
};

export default function TimeMachinePage() {
  return <TimeMachineClient />;
}
