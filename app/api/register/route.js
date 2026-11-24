import bcrypt from "bcryptjs";
import { db, ensureTables } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const e = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return Response.json({ error: "Email 格式不正確。" }, { status: 400 });
    if (String(password || "").length < 8) return Response.json({ error: "密碼至少 8 個字元。" }, { status: 400 });
    await ensureTables();
    const sql = db();
    const exists = await sql`SELECT id FROM users WHERE email = ${e}`;
    if (exists.length) return Response.json({ error: "這個 Email 已經註冊過了，請直接登入。" }, { status: 409 });
    const hash = await bcrypt.hash(password, 10);
    const [user] = await sql`INSERT INTO users (email, password_hash) VALUES (${e}, ${hash}) RETURNING id, email`;
    await setSession(user);
    return Response.json({ user });
  } catch (err) {
    return Response.json({ error: err.message || "註冊失敗" }, { status: 500 });
  }
}
