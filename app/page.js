"use client";
import { useEffect, useState } from "react";

const TOPICS = ["力學", "熱學", "電磁學", "光學", "近代物理", "其他"];
const card = { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,.06)", marginBottom: 16 };
const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15 };
const btn = (on = true) => ({ padding: "10px 16px", borderRadius: 10, border: "none", background: on ? "#0f766e" : "#9ca3af", color: "#fff", fontSize: 15, cursor: on ? "pointer" : "default" });

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "發生錯誤");
  return data;
}

function AuthForm({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const { user } = await api(mode === "login" ? "/api/login" : "/api/register", { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin(user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <section style={{ ...card, maxWidth: 420, margin: "40px auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["login", "登入"], ["register", "註冊"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #0f766e", background: mode === m ? "#0f766e" : "#fff", color: mode === m ? "#fff" : "#0f766e", cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      <form onSubmit={submit}>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...input, marginBottom: 10 }} />
        <input type="password" required minLength={8} placeholder="密碼（至少 8 個字元）" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...input, marginBottom: 12 }} />
        {error && <p style={{ color: "#b91c1c", fontSize: 14 }}>⚠️ {error}</p>}
        <button type="submit" disabled={busy} style={{ ...btn(!busy), width: "100%" }}>{busy ? "處理中…" : mode === "login" ? "登入" : "建立帳號"}</button>
      </form>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 0 }}>開放公開註冊；密碼以 bcrypt 雜湊後存放。</p>
    </section>
  );
}

export default function Home() {
  const [user, setUser] = useState(undefined);
  const [apiKey, setApiKey] = useState("");
  const [topic, setTopic] = useState("力學");
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState("全部");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/me").then(({ user }) => setUser(user)).catch(() => setUser(null));
    try { setApiKey(sessionStorage.getItem("openai_key") || ""); } catch {}
  }, []);

  useEffect(() => {
    if (user) api("/api/notes").then(({ notes }) => setNotes(notes)).catch((e) => setError(e.message));
    else setNotes([]);
  }, [user]);

  async function ask() {
    setError(""); setBusy(true);
    try { sessionStorage.setItem("openai_key", apiKey.trim()); } catch {}
    try {
      const { note } = await api("/api/notes", { method: "POST", headers: { "x-openai-key": apiKey.trim() }, body: JSON.stringify({ topic, question }) });
      setNotes((n) => [note, ...n]);
      setQuestion("");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function remove(id) {
    try { await api(`/api/notes/${id}`, { method: "DELETE" }); setNotes((n) => n.filter((x) => x.id !== id)); }
    catch (e) { setError(e.message); }
  }

  async function logout() { await api("/api/logout", { method: "POST" }); setUser(null); }

  const shown = filter === "全部" ? notes : notes.filter((n) => n.topic === filter);

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>📒 普物 AI 筆記本</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0" }}>把卡住的觀念丟給 AI，整理成複習筆記並存在你的帳號裡。</p>
        </div>
        {user && <div style={{ fontSize: 14 }}>{user.email}　<button onClick={logout} style={{ ...btn(), background: "#6b7280", padding: "6px 12px" }}>登出</button></div>}
      </header>

      {user === undefined && <p style={{ marginTop: 40, textAlign: "center", color: "#6b7280" }}>載入中…</p>}
      {user === null && <AuthForm onLogin={setUser} />}

      {user && (
        <>
          <section style={{ ...card, marginTop: 20 }}>
            <h2 style={{ fontSize: 17, marginTop: 0 }}>① OpenAI API Key（BYOK）</h2>
            <input type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={input} autoComplete="off" />
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 0 }}>金鑰只存在這個分頁（關閉即清除），每次請求轉交 OpenAI，不會存進資料庫。</p>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 17, marginTop: 0 }}>② 想複習什麼？</h2>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} style={{ ...input, width: "auto", marginBottom: 10 }}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：角動量守恆什麼時候成立？為什麼溜冰選手收手會轉更快？" style={{ ...input, resize: "vertical" }} />
            <button onClick={ask} disabled={busy || !apiKey || !question.trim()} style={{ ...btn(!(busy || !apiKey || !question.trim())), marginTop: 12, width: "100%" }}>{busy ? "AI 整理中…" : "產生筆記並儲存"}</button>
            {error && <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 0 }}>⚠️ {error}</p>}
          </section>

          <section>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <strong>我的筆記（{notes.length}）</strong>
              {["全部", ...TOPICS].map((t) => (
                <button key={t} onClick={() => setFilter(t)} style={{ border: "1px solid #99f6e4", background: filter === t ? "#0f766e" : "#f0fdfa", color: filter === t ? "#fff" : "#115e59", borderRadius: 999, padding: "3px 12px", cursor: "pointer", fontSize: 13 }}>{t}</button>
              ))}
            </div>
            {shown.length === 0 && <p style={{ color: "#6b7280" }}>還沒有筆記，先問一個問題吧！</p>}
            {shown.map((n) => (
              <article key={n.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div><span style={{ background: "#ccfbf1", color: "#115e59", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>{n.topic}</span> <strong>{n.question}</strong></div>
                  <button onClick={() => remove(n.id)} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", whiteSpace: "nowrap" }}>刪除</button>
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, marginTop: 10 }}>{n.answer}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>{new Date(n.created_at).toLocaleString("zh-TW")}</div>
              </article>
            ))}
          </section>
        </>
      )}
      <footer style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 24 }}>Next.js × Neon Postgres × OpenAI（BYOK）</footer>
    </main>
  );
}
