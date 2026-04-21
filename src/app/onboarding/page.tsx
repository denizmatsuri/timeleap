import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(createLoginRedirectPath("/onboarding"));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load onboarding profile: ${profileError.message}`);
  }

  if (profile?.onboarding_completed_at) {
    redirect("/");
  }

  return (
    <div className="bg-paper text-ink relative min-h-dvh overflow-x-hidden">
      <div className="paper-grain pointer-events-none absolute inset-0 z-0" />

      <nav className="border-ink/12 bg-paper/80 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-300 items-center gap-6 px-6 py-3.5">
          <Link
            href="/"
            className="font-display flex items-center gap-2.5 text-[22px] font-medium tracking-[-0.02em]"
          >
            <div className="brand-mark h-7.5 w-7.5" />
            <div>
              <div>TIMELEAP</div>
              <div className="font-mono text-[9px] font-normal tracking-[.12em] uppercase opacity-55">
                Archive of Impossible Days
              </div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="border-ink/12 bg-paper-2/70 hidden rounded-full border px-3 py-2 font-mono text-[10px] tracking-[0.08em] opacity-55 sm:inline-flex">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="font-mono rounded-full px-3.5 py-2 text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="relative z-10 px-6 py-14">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="flex flex-col justify-between rounded-[32px] border border-[rgba(76,53,34,0.08)] bg-[linear-gradient(180deg,rgba(244,238,227,0.96),rgba(237,229,216,0.92))] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,.18)]">
            <div>
              <span className="stamp mb-5 inline-flex">PASSPORT CHECK</span>
              <h1 className="font-display text-[clamp(42px,5vw,66px)] leading-[0.93] tracking-[-0.04em]">
                첫 여행 전,
                <br />
                <em>탑승 정보</em>를 남겨요
              </h1>
              <p className="mt-6 max-w-sm text-[15px] leading-[1.8] opacity-60">
                얼굴 사진과 여행 결과를 연결할 기본 프로필입니다. 지금은 최소
                정보만 받고, 세부 설정은 나중에 바꿀 수 있게 둘 예정입니다.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              <div className="border-ink/12 bg-paper/70 rounded-2xl border px-4 py-4">
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase opacity-45">
                  PASSENGER
                </div>
                <div className="mt-2 font-display text-[22px] tracking-[-0.03em]">
                  {profile?.display_name ?? "이름 미등록"}
                </div>
              </div>
              <div className="border-ink/12 bg-paper/50 rounded-2xl border px-4 py-4 text-[14px] leading-[1.7] opacity-60">
                온보딩이 끝나면 다음 단계에서는 얼굴 사진 업로드와 시대 선택
                화면을 이어서 붙이면 됩니다.
              </div>
            </div>
          </section>

          <section className="bg-paper relative overflow-hidden rounded-[32px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.18),0_4px_16px_rgba(0,0,0,.07)]">
            <div className="border-ink/10 flex items-center justify-between border-b border-dashed px-7 py-5">
              <div>
                <div className="font-display text-[15px] font-medium tracking-wide">
                  BOARDING PROFILE
                </div>
                <div className="font-mono text-[9px] tracking-[.15em] opacity-45">
                  STEP 01 · BASIC INFO
                </div>
              </div>
              <div className="font-mono text-[10px] tracking-[.15em] opacity-30">
                NO. 00412
              </div>
            </div>

            <div className="space-y-8 px-7 py-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase opacity-45">
                    CURRENT PASSENGER
                  </div>
                  <div className="font-display mt-2 text-[30px] tracking-[-0.03em]">
                    {user.email?.split("@")[0] ?? "traveler"}
                  </div>
                </div>
                <div className="border-ink/12 bg-paper-2/70 rounded-full border px-3 py-2 font-mono text-[10px] tracking-[0.1em] uppercase opacity-50">
                  AUTH ACTIVE
                </div>
              </div>

              <OnboardingForm
                defaultValues={{
                  ageRange: profile?.age_range ?? "",
                  displayName: profile?.display_name ?? "",
                  gender: profile?.gender ?? "",
                  username: profile?.username ?? "",
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
