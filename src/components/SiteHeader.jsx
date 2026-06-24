export default function SiteHeader({ title, subtitle, points, onLogout }) {
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
        <div style={{ flex: 1, minWidth: 240 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ margin: "0 0 6px", color: "#1e293b" }}>{title}</h1>
            {typeof points === "number" && (
              <span style={pointsBadgeStyle} title="누적 포인트">
                🪙 {points.toLocaleString("ko-KR")}P
              </span>
            )}
          </div>
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

const pointsBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 999,
  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  border: "1px solid #fbbf24",
  color: "#92400e",
  fontSize: 15,
  fontWeight: 800,
  whiteSpace: "nowrap",
  boxShadow: "0 2px 8px rgba(251, 191, 36, 0.25)",
};
