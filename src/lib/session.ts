import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "teqemach_session";
const SECRET = new TextEncoder().encode(
  process.env.CUSTOM_SESSION_SECRET ?? "teqemach_fallback_secret_change_me_in_env"
);

export interface CustomSessionPayload {
  userId: string;
  role: "collector" | "contributor";
  email: string;
}

/**
 * Create and persist a signed JWT cookie for collector/contributor users.
 * Should be called server-side (Server Action or Route Handler).
 */
export async function createCustomSession(payload: CustomSessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Read and verify the custom session cookie.
 * Returns null if missing or invalid.
 */
export async function getCustomSession(): Promise<CustomSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as CustomSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Clear the custom session cookie (logout).
 */
export async function clearCustomSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
