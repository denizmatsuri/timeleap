import { NextResponse, type NextRequest } from "next/server";
import { createLoginRedirectPath } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PATH_PREFIXES = ["/me", "/onboarding", "/time-machine"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const redirectResponse = NextResponse.redirect(
      new URL(createLoginRedirectPath(nextPath), request.url),
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
