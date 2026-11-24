import bcrypt from "bcryptjs";
import { db, ensureTables } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const e = String(email || "").trim().toLowerCase();
    await ensureTables();
    const sql = db();
    const [row] = await sql`SELECT id, email, password_hash FROM users WHERE email = ${e}`;
    if (!row || !(await bcrypt.compare(String(password || ""), row.password_hash))) {
      return Response.json({ error: "Email 或密碼錯誤。" }, { status: 401 });
    }
    const user = { id: row.id, email: row.email };
    await setSession(user);
    return Response.json({ user });
  } catch (err) {
    return Response.json({ error: err.message || "登入失敗" }, { status: 500 });
  }
}
