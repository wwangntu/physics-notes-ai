import { db, ensureTables } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function DELETE(_req, { params }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  const { id } = await params;
  await ensureTables();
  const rows = await db()`DELETE FROM notes WHERE id = ${Number(id)} AND user_id = ${user.id} RETURNING id`;
  if (!rows.length) return Response.json({ error: "找不到這則筆記。" }, { status: 404 });
  return Response.json({ ok: true });
}
