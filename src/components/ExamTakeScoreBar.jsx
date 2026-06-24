import AnswerClearButton from "./AnswerClearButton";

export default function ExamTakeScoreBar({
  total,
  submitted = false,
  hasAnswers = false,
  onClearAll,
  style,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <span style={{ color: "#475569", fontWeight: 600, fontSize: 16 }}>
        문항당 1점 · 총 {total}점
      </span>
      {!submitted && onClearAll ? (
        <AnswerClearButton disabled={!hasAnswers} onClear={onClearAll} />
      ) : null}
    </div>
  );
}
