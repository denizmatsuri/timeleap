import { redirect } from "next/navigation";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/app/onboarding/_components/onboarding-form";

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
  );
}
