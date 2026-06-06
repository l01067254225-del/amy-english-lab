import { useState } from "react";

export default function StudentLogin({ onLogin, onBack }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const loginError = onLogin(id, password);
    if (loginError) {
      setError(loginError);
      return;
    }
    setError("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(400px, 100%)",
          background: "white",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", color: "#1e293b" }}>AMY ENGLISH LAB</h1>
        <p style={{ margin: "0 0 20px", color: "#64748b" }}>
          아이디와 비밀번호를 입력하세요
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            아이디
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="아이디"
              autoComplete="username"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              style={inputStyle}
            />
          </label>

          {error && (
            <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{error}</p>
          )}

          <button type="submit" style={btnStyle}>
            입장
          </button>
        </form>
        {onBack && (
          <button type="button" onClick={onBack} style={backStyle}>
            이전으로
          </button>
        )}
      </div>
    </div>
  );
}

const backStyle = {
  marginTop: 12,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
};

const labelStyle = {
  display: "block",
  marginBottom: 14,
  fontWeight: 600,
  color: "#334155",
  fontSize: 14,
};

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd",
  boxSizing: "border-box",
  fontSize: 15,
};

const btnStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
};
