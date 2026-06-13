import {
  getCorrectionFieldMinHeight,
  getCorrectionFieldRows,
} from "../utils/incorrectAnswerNoteFields";

export default function IncorrectAnswerCorrectionField({
  subject,
  value = "",
  onChange,
  questionNum,
}) {
  const rows = getCorrectionFieldRows(subject);
  const minHeight = getCorrectionFieldMinHeight(subject);

  return (
    <div className="incorrect-note-correction-wrap" style={wrapStyle}>
      <label
        htmlFor={`correction-${questionNum}`}
        className="incorrect-note-correction-label"
        style={labelStyle}
      >
        오답 정리 작성
      </label>
      <textarea
        id={`correction-${questionNum}`}
        className={`incorrect-note-correction-textarea incorrect-note-correction-textarea--${rows === 1 ? "single" : "multi"}`}
        rows={rows}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="틀린 이유, 다시 쓸 답안, 메모 등을 입력하세요."
        style={{ ...textareaStyle, minHeight }}
      />
    </div>
  );
}

const wrapStyle = {
  marginTop: 12,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
};

const textareaStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: 14,
  lineHeight: 1.55,
  fontFamily: "'Malgun Gothic', 'Segoe UI', Arial, sans-serif",
  color: "#0f172a",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  resize: "vertical",
};
