import Link from "next/link";
import { signOut } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

const SECONDARY_LINK_CLASS =
  "rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-70 transition-opacity hover:opacity-100";
const MUTED_ACTION_CLASS =
  "rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100";
const PRIMARY_ACTION_CLASS =
  "bg-ink text-paper ml-2 rounded-full px-4 py-2.5 font-sans text-[13px] font-medium transition-transform hover:-translate-y-px";

function getUserLabel({
  displayName,
  email,
}: {
  displayName?: string | null;
  email?: string | null;
}) {
  const trimmedName = displayName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const [localPart] = email?.split("@") ?? [];

  return localPart || "여행자";
}

function getPrimaryAction(user: { isOnboardingComplete: boolean } | null) {
  if (!user) {
    return { href: "/login", label: "타임머신 타기" };
  }

  if (!user.isOnboardingComplete) {
    return { href: "/onboarding", label: "탑승 준비" };
  }

  return { href: "/time-machine", label: "타임머신" };
}

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: profile } = authUser
    ? await supabase
        .from("profiles")
        .select("display_name, onboarding_completed_at")
        .eq("id", authUser.id)
        .maybeSingle()
    : { data: null };
  const user = authUser
    ? {
        isOnboardingComplete: Boolean(profile?.onboarding_completed_at),
        label: getUserLabel({
          displayName: profile?.display_name,
          email: authUser.email,
        }),
      }
    : null;
  const primaryAction = getPrimaryAction(user);
  const showProfileLink = Boolean(user?.isOnboardingComplete);

  return (
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

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/diaries"
            className={`${SECONDARY_LINK_CLASS} hidden sm:inline-flex`}
          >
            둘러보기
          </Link>
          {showProfileLink ? (
            <Link href="/me" className={SECONDARY_LINK_CLASS}>
              마이페이지
            </Link>
          ) : null}
          {user ? (
            <span className="border-ink/12 bg-paper-2/70 hidden rounded-full border px-3 py-2 font-mono text-[10px] tracking-[.08em] opacity-55 sm:inline-flex">
              {user.label}
            </span>
          ) : null}
          {user ? (
            <form action={signOut}>
              <button type="submit" className={MUTED_ACTION_CLASS}>
                로그아웃
              </button>
            </form>
          ) : null}
          {primaryAction ? (
            <Link href={primaryAction.href} className={PRIMARY_ACTION_CLASS}>
              {primaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
