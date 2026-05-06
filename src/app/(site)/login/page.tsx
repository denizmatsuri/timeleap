import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import GoogleSignInButton from "@/app/login/_components/google-sign-in-button";

const ERROR_MESSAGE_BY_CODE = {
  auth_failed: "Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  profile_sync_failed:
    "로그인은 되었지만 프로필 준비에 실패했습니다. 다시 시도해 주세요.",
} as const;

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/onboarding");
  }

  const resolvedSearchParams = await searchParams;
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error;
  const errorMessage = errorCode
    ? (ERROR_MESSAGE_BY_CODE[errorCode as keyof typeof ERROR_MESSAGE_BY_CODE] ??
      "로그인 처리 중 문제가 발생했습니다.")
    : null;
  const nextPath = normalizeNextPath(resolvedSearchParams.next);

  return (
    <>
      {/* Main */}
      <div className="relative z-10 flex min-h-[calc(100dvh-57px)] items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-4xl items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          {/* Left: atmospheric — desktop only */}
          <div className="hidden lg:block">
            <div className="mb-7">
              <span className="stamp">BOARDING PASS</span>
            </div>
            <h1 className="hero-title font-display mb-7 text-[clamp(52px,6vw,82px)] leading-[0.92] font-light tracking-[-0.035em]">
              탑승을
              <br />
              <em>시작합니다</em>
            </h1>
            <p className="max-w-xs text-[16px] leading-[1.65] opacity-60">
              이 여권은 한 번만 만들면 어디든 갈 수 있어요.
              <br />
              Google 계정으로 1분 안에 시작하세요.
            </p>

            {/* Mini destination stubs */}
            <div className="mt-12 flex max-w-sm flex-col gap-3">
              <div className="border-ink/12 bg-paper-2/70 flex -rotate-[1.5deg] items-center gap-0 rounded-lg border px-4 py-3 opacity-75">
                <span className="font-mono text-[9px] tracking-[.1em] uppercase">
                  SEOUL · 2026
                </span>
                <span className="mx-3 font-mono text-[9px] opacity-40">→</span>
                <span className="font-mono text-[9px] tracking-[.1em] uppercase">
                  NEW YORK · 1925
                </span>
                <span className="ml-auto font-mono text-[8px] tracking-[.1em] opacity-30">
                  NO. 00412
                </span>
              </div>
              <div className="border-ink/12 bg-paper-2/70 flex rotate-[1deg] items-center gap-0 rounded-lg border px-4 py-3 opacity-60">
                <span className="font-mono text-[9px] tracking-[.1em] uppercase">
                  SEOUL · 2026
                </span>
                <span className="mx-3 font-mono text-[9px] opacity-40">→</span>
                <span className="font-mono text-[9px] tracking-[.1em] uppercase">
                  TOKYO · 1968
                </span>
                <span className="ml-auto font-mono text-[8px] tracking-[.1em] opacity-30">
                  NO. 00855
                </span>
              </div>
              <div className="border-ink/12 bg-paper-2/70 flex -rotate-[0.5deg] items-center gap-0 rounded-lg border px-4 py-3 opacity-45">
                <span className="font-mono text-[9px] tracking-[.1em] uppercase">
                  SEOUL · 2026
                </span>
                <span className="mx-3 font-mono text-[9px] opacity-40">→</span>
                <span className="font-mono text-[9px] tracking-[.1em] uppercase">
                  PARIS · 1977
                </span>
                <span className="ml-auto font-mono text-[8px] tracking-[.1em] opacity-30">
                  NO. 01203
                </span>
              </div>
            </div>
          </div>

          {/* Right: boarding pass auth card */}
          <div>
            {/* Mobile-only header */}
            <div className="mb-8 lg:hidden">
              <div className="mb-4">
                <span className="stamp">BOARDING PASS</span>
              </div>
              <h1 className="hero-title font-display text-[42px] leading-[0.92] font-light tracking-[-0.03em]">
                탑승을 <em>시작합니다</em>
              </h1>
            </div>

            {/* Card */}
            <div className="bg-paper relative overflow-visible rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,.18),0_4px_16px_rgba(0,0,0,.07)]">
              {/* Ticket notch cutouts */}
              <div className="border-ink/12 bg-paper-2 absolute top-1/2 -left-3.5 z-10 h-7 w-7 -translate-y-1/2 rounded-full border shadow-[inset_0_1px_3px_rgba(0,0,0,.06)]" />
              <div className="border-ink/12 bg-paper-2 absolute top-1/2 -right-3.5 z-10 h-7 w-7 -translate-y-1/2 rounded-full border shadow-[inset_0_1px_3px_rgba(0,0,0,.06)]" />

              {/* Top bar */}
              <div className="border-ink/10 flex items-center justify-between border-b border-dashed px-6 py-4">
                <div>
                  <div className="font-display text-sm font-medium tracking-wide">
                    TIMELEAP
                  </div>
                  <div className="font-mono text-[9px] tracking-[.15em] opacity-50">
                    BOARDING PASS
                  </div>
                </div>
                <div className="font-mono text-[10px] tracking-[.15em] opacity-35">
                  NO. 00412
                </div>
              </div>

              {/* Trip info */}
              <div className="px-6 pt-5 pb-0">
                <div className="flex items-end gap-5">
                  <div>
                    <div className="mb-1.5 font-mono text-[8px] tracking-[.15em] uppercase opacity-45">
                      FROM
                    </div>
                    <div className="font-display leading-none">
                      <div className="text-[26px] font-medium tracking-tight">
                        2026
                      </div>
                      <div className="text-ember mt-1 font-mono text-[9px] font-medium tracking-[.12em]">
                        SEOUL
                      </div>
                    </div>
                  </div>
                  <div className="text-ember-2 pb-3 text-lg font-light opacity-60">
                    →
                  </div>
                  <div>
                    <div className="mb-1.5 font-mono text-[8px] tracking-[.15em] uppercase opacity-45">
                      TO
                    </div>
                    <div className="font-display leading-none">
                      <div className="text-[26px] font-medium tracking-tight opacity-40">
                        ?
                      </div>
                      <div className="text-ember mt-1 font-mono text-[9px] font-medium tracking-[.12em]">
                        ANYWHERE
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="mb-1.5 font-mono text-[8px] tracking-[.15em] uppercase opacity-45">
                      PASSENGER
                    </div>
                    <div className="font-display text-[14px] leading-none font-medium">
                      당신
                    </div>
                    <div className="mt-1 font-mono text-[9px] tracking-[.08em] opacity-40">
                      · P
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-ink/10 mx-6 mt-5 border-t border-dashed" />

              {/* Auth area */}
              <div className="px-6 py-6">
                <GoogleSignInButton nextPath={nextPath} />

                {errorMessage ? (
                  <div className="border-ink/12 bg-paper-2/80 mt-4 rounded-xl border px-4 py-3 text-center">
                    <p className="font-mono text-[10px] leading-[1.8] tracking-[0.08em] opacity-65">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                <p className="mt-5 text-center font-mono text-[9px] leading-[1.7] tracking-wide opacity-40">
                  계속하면{" "}
                  <a
                    href="#"
                    className="underline underline-offset-[3px] transition-opacity hover:opacity-70"
                  >
                    이용약관
                  </a>
                  과{" "}
                  <a
                    href="#"
                    className="underline underline-offset-[3px] transition-opacity hover:opacity-70"
                  >
                    개인정보처리방침
                  </a>
                  에 동의합니다.
                  <br />
                  얼굴 사진은 암호화 저장되며 언제든 완전히 삭제할 수 있습니다.
                </p>
              </div>

              {/* Barcode */}
              <div className="border-ink/10 border-t border-dashed px-6 pt-3 pb-4">
                <div className="barcode-bg h-4 rounded-sm opacity-30" />
              </div>
            </div>

            <div className="mt-5 text-center">
              <Link
                href="/"
                className="font-mono text-[11px] tracking-[.08em] uppercase opacity-40 transition-opacity hover:opacity-65"
              >
                ← 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
