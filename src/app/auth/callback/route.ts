import { NextRequest, NextResponse } from "next/server";
import { normalizeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/login?error=auth_failed&next=${encodeURIComponent(nextPath)}`,
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/login?error=auth_failed&next=${encodeURIComponent(nextPath)}`,
        requestUrl.origin,
      ),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      new URL(
        `/login?error=auth_failed&next=${encodeURIComponent(nextPath)}`,
        requestUrl.origin,
      ),
    );
  }

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  if (upsertError) {
    return NextResponse.redirect(
      new URL("/login?error=profile_sync_failed", requestUrl.origin),
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.redirect(
      new URL("/login?error=profile_sync_failed", requestUrl.origin),
    );
  }

  const destination = profile?.onboarding_completed_at ? nextPath : "/onboarding";

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
