import type { Metadata } from "next";
import ChronoGatePreview from "@/app/preview/time-machine-loading/_components/chrono-gate-preview";
import { getCurrentUserFaceImageUrls } from "@/lib/time-machine/face-image-urls";

export const metadata: Metadata = {
  title: "Loading Preview — Timeleap",
  description: "Timeleap 타임머신 로딩 화면 디자인 미리보기",
};

export default async function TimeMachineLoadingPreviewPage() {
  const profilePhotoUrls = await getCurrentUserFaceImageUrls();

  return <ChronoGatePreview profilePhotoUrls={profilePhotoUrls} />;
}
