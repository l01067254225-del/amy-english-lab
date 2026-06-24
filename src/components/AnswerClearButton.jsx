export const ANSWER_CLEAR_CONFIRM_MESSAGE = "전체 삭제 하시겠습니까?";

export default function AnswerClearButton({
  onClear,
  disabled = false,
  label = "전체 삭제",
}) {
  const handleClick = () => {
    if (disabled) return;
    if (!window.confirm(ANSWER_CLEAR_CONFIRM_MESSAGE)) return;
    onClear();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title="답안 전체 삭제"
      aria-label="답안 전체 삭제"
      style={{
        ...btnStyle,
        ...(disabled ? btnDisabledStyle : {}),
      }}
    >
      {label}
    </button>
  );
}

const btnStyle = {
  flexShrink: 0,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1.2,
};

const btnDisabledStyle = {
  opacity: 0.45,
  cursor: "not-allowed",
};
