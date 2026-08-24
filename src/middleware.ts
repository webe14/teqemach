import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "teqemach_session";
const SECRET = new TextEncoder().encode(
  process.env.CUSTOM_SESSION_SECRET ?? "teqemach_fallback_secret_change_me_in_env"
);

async function getCustomSession(request: NextRequest): Promise<{ userId: string; role: string; email?: string } | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: string; role: string; email?: string };
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
    // 1. Check Supabase Auth session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userRole: string | null = null;
    let userId: string | null = null;

    if (user) {
      userId = user.id;
      let { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile && user.email) {
        const { data: emailProfile } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("email", user.email)
          .maybeSingle();
        profile = emailProfile;
      }

      if (profile) {
        userRole = profile.role;
      }
    }

    // 2. Check custom session cookie if no Supabase Auth user found
    if (!userRole) {
      const customSession = await getCustomSession(request);
      if (customSession) {
        userId = customSession.userId;
        userRole = customSession.role;
      }
    }

    // Neither session found -> redirect to login
    if (!userId || !userRole) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 3. Check profile permissions
    // Admins and Collectors can freely visit BOTH /dashboard/admin and /dashboard/contributor
    if (userRole === "admin" || userRole === "collector") {
      return supabaseResponse;
    }

    // If session role is contributor, check if they are trying to access admin panel
    if (userRole === "contributor") {
      if (pathname.startsWith("/dashboard/admin")) {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("role, telegram_id, email, phone_number")
          .eq("id", userId)
          .maybeSingle();

        if (dbProfile?.role === "admin" || dbProfile?.role === "collector") {
          return supabaseResponse;
        }

        if (dbProfile) {
          const conditions: string[] = [];
          if (dbProfile.telegram_id) conditions.push(`telegram_id.eq.${dbProfile.telegram_id}`);
          if (dbProfile.email) conditions.push(`email.eq.${dbProfile.email}`);
          if (dbProfile.phone_number) conditions.push(`phone_number.eq.${dbProfile.phone_number}`);

          if (conditions.length > 0) {
            const { data: adminMatches } = await supabase
              .from("profiles")
              .select("id")
              .in("role", ["admin", "collector"])
              .or(conditions.join(","))
              .limit(1);

            if (adminMatches && adminMatches.length > 0) {
              return supabaseResponse;
            }
          }
        }

        return NextResponse.redirect(new URL("/dashboard/contributor", request.url));
      }
    }

    return supabaseResponse;
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
