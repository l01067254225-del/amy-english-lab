export default function ReadingPassagePreview({ passage, label = "지문 미리보기" }) {
  const text = String(passage ?? "").trim();
  if (!text) return null;

  return (
    <div style={boxStyle}>
      <span style={labelStyle}>{label}</span>
      <p style={textStyle}>{text}</p>
    </div>
  );
}

const boxStyle = {
  marginTop: 12,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #c4b5fd",
  background: "#faf5ff",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontSize: 12,
  fontWeight: 800,
  color: "#6d28d9",
  letterSpacing: "0.04em",
};

const textStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.85,
  color: "#1e293b",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
