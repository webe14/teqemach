import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "teqemach_session";
const SECRET = new TextEncoder().encode(
  process.env.CUSTOM_SESSION_SECRET ?? "teqemach_fallback_secret_change_me_in_env"
);

async function getCustomSessionRole(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { pathname } = request.nextUrl;

  // Public routes (no auth needed)
  const publicPaths = ["/login", "/admin-secure", "/auth/callback"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  // API routes pass through
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/dashboard")) {
    // ── Check Supabase Auth session (admin, or newly registered users, or OAuth) ────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (!user.email_confirmed_at) {
        return NextResponse.redirect(new URL("/login?error=email_not_verified", request.url));
      }

      let { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile && user.email) {
        const { data: emailProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", user.email)
          .single();
        profile = emailProfile;
      }

      if (!profile) {
        return NextResponse.redirect(new URL("/login?error=account_not_found", request.url));
      }

      const role = profile.role;

      if (role === "admin" && !pathname.startsWith("/dashboard/admin")) {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      }
      if (role === "collector" && !pathname.startsWith("/dashboard/collector")) {
        return NextResponse.redirect(new URL("/dashboard/collector", request.url));
      }
      if (role === "contributor" && !pathname.startsWith("/dashboard/contributor")) {
        return NextResponse.redirect(new URL("/dashboard/contributor", request.url));
      }

      return supabaseResponse;
    }

    // ── Check custom session cookie (collector / contributor) ─────────────
    const customRole = await getCustomSessionRole(request);

    if (customRole) {
      if (customRole === "collector" && !pathname.startsWith("/dashboard/collector")) {
        return NextResponse.redirect(new URL("/dashboard/collector", request.url));
      }
      if (customRole === "contributor" && !pathname.startsWith("/dashboard/contributor")) {
        return NextResponse.redirect(new URL("/dashboard/contributor", request.url));
      }
      return supabaseResponse;
    }

    // ── Neither session found — redirect to login ─────────────────────────
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect root to login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
