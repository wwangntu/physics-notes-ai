import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE = "session";

function secret() {
  const base = process.env.AUTH_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!base) throw new Error("缺少 AUTH_SECRET。");
  return new Uint8Array(createHash("sha256").update("physics-notes:" + base).digest());
}

export async function setSession(user) {
  const token = await new SignJWT({ uid: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}
