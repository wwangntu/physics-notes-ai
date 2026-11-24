export const metadata = {
  title: "普物 AI 筆記本",
  description: "登入後用 AI 產生普物複習筆記並存起來（自備 OpenAI API Key）",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Noto Sans TC', sans-serif", background: "#f5f7f4", color: "#1f2937" }}>
        {children}
      </body>
    </html>
  );
}
