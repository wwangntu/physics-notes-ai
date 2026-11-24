import { db, ensureTables } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const TOPICS = ["力學", "熱學", "電磁學", "光學", "近代物理", "其他"];

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  await ensureTables();
  const notes = await db()`SELECT id, topic, question, answer, created_at FROM notes WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`;
  return Response.json({ notes });
}

export async function POST(req) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  const apiKey = req.headers.get("x-openai-key");
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return Response.json({ error: "請先輸入有效的 OpenAI API Key（以 sk- 開頭）。" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "").trim();
  const topic = TOPICS.includes(body.topic) ? body.topic : "其他";
  if (!question) return Response.json({ error: "請輸入想問的觀念或題目。" }, { status: 400 });
  if (question.length > 2000) return Response.json({ error: "內容太長了（上限 2000 字）。" }, { status: 400 });

  let r;
  try {
    r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "你是大學普通物理助教，用繁體中文寫一份精簡的複習筆記。格式：\n【核心觀念】2–3 句\n【關鍵公式】列點，符號要說明並附單位\n【常見錯誤】2 點\n【小練習】1 題並附簡答。公式用純文字表示。",
          },
          { role: "user", content: `主題：${topic}\n問題：${question}` },
        ],
      }),
    });
  } catch {
    return Response.json({ error: "無法連線到 OpenAI，請稍後再試。" }, { status: 502 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return Response.json({ error: data?.error?.message || `OpenAI 回傳錯誤（${r.status}）` }, { status: r.status === 401 ? 401 : 502 });
  }
  const answer = data.choices?.[0]?.message?.content || "（沒有回應）";
  await ensureTables();
  const [note] = await db()`INSERT INTO notes (user_id, topic, question, answer) VALUES (${user.id}, ${topic}, ${question}, ${answer}) RETURNING id, topic, question, answer, created_at`;
  return Response.json({ note });
}
