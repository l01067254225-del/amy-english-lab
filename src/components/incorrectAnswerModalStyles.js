export const incorrectAnswerFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 10,
  marginTop: 24,
  paddingTop: 8,
};

export const incorrectAnswerCloseBtnStyle = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const incorrectAnswerPrimaryBtnStyle = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const incorrectAnswerSecondaryBtnStyle = {
  ...incorrectAnswerPrimaryBtnStyle,
  background: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
};
