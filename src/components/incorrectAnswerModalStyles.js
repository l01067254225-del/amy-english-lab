export const incorrectAnswerFooterStyle = {
  display: "flex",
  flexWrap: "nowrap",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 10,
  marginTop: 24,
  paddingTop: 8,
  width: "100%",
};

const baseBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
  padding: "12px 20px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1.2,
};

export const incorrectAnswerSubmitBtnStyle = {
  ...baseBtnStyle,
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
};

export const incorrectAnswerRetryBtnStyle = {
  ...baseBtnStyle,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
};

export const incorrectAnswerCloseBtnStyle = {
  ...baseBtnStyle,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 700,
};

// Legacy aliases
export const incorrectAnswerPrimaryBtnStyle = incorrectAnswerSubmitBtnStyle;
export const incorrectAnswerSecondaryBtnStyle = incorrectAnswerRetryBtnStyle;
