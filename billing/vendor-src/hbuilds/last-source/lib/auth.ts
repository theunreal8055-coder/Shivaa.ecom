import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "shivaa_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "shivaa-dev-secret-change-me");
}

export type Session = { userId: number; email: string; name: string };

export async function createSession(user: { id: number; email: string; name?: string | null }) {
  const token = await new SignJWT({ email: user.email, name: user.name || "Owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: Number(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || "Owner"),
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
