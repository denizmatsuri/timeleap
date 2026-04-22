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
  const { data: faceImages, error: faceImagesError } = await supabase
    .from("profile_face_images")
    .select("storage_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (profileError) {
    throw new Error(
      `Failed to load onboarding profile: ${profileError.message}`,
    );
  }

  if (faceImagesError) {
    throw new Error(
      `Failed to load onboarding face images: ${faceImagesError.message}`,
    );
  }

  // if (profile?.onboarding_completed_at) {
  //   redirect("/");
  // }

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
                className="rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[.08em] uppercase opacity-55 transition-opacity hover:opacity-100"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="relative z-10 px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <OnboardingForm
            defaultValues={{
              ageRange: profile?.age_range ?? "",
              displayName: profile?.display_name ?? "",
              gender: profile?.gender ?? "",
            }}
            initialPhotoPaths={faceImages.map((image) => image.storage_path)}
            userEmail={user.email ?? ""}
            userId={user.id}
          />
        </div>
      </div>
    </div>
  );
}
