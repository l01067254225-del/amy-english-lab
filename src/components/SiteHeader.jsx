export default function SiteHeader({ title, subtitle, onLogout }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px", color: "#1e293b" }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{subtitle}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{ ...linkStyle, cursor: "pointer" }}
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const linkStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
};
