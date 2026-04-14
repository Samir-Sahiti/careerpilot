import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() is used here — NOT getUser() — because fallback must
  // refresh the session cookie on every request per the Supabase SSR pattern.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/cv") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/interview") ||
    pathname.startsWith("/career") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/cover-letter") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/analytics");

  // Unauthenticated user trying to access a protected route → redirect to /login
  if (!session && isDashboardRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user visiting /login or /signup → redirect to /dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Run on every route EXCEPT Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
