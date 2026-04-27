import type { Metadata } from "next";
import TimeMachineClient from "@/app/time-machine/_components/time-machine-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Time Machine Atlas — Timeleap",
  description: "Timeleap 타임머신을 타고 세계 여행을 떠나보세요.",
};

export default async function TimeMachinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <TimeMachineClient
      showMyDiariesLink={Boolean(user && profile?.onboarding_completed_at)}
    />
  );
}
