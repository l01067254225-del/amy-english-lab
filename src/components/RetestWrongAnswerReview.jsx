import QuestionCard from "./QuestionCard";
import { shouldShowReadingPassage } from "../utils/examTakeView";
import {
  formatStoredUserAnswer,
  getRetestReviewItems,
} from "../utils/examRetestStorage";

export default function RetestWrongAnswerReview({
  result,
  studentName,
  mode = "inline",
  onClose,
  onStartExam,
  showStartButton = false,
}) {
  const items = getRetestReviewItems(result);
  const questions = items.map((item) => item.question);

  const content = (
    <>
      <div style={headerStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: mode === "modal" ? 20 : 18, color: "#0f172a" }}>
          오답 확인
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          {studentName || "학생"} · {result?.testTitle} · 틀린 문항 {items.length}개
          {mode === "inline" ? " · 아래 내용을 확인한 뒤 재시험을 시작하세요." : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <p style={{ margin: "12px 0 0", color: "#64748b" }}>
          확인할 오답이 없습니다.
        </p>
      ) : (
        <div style={listStyle}>
          {items.map((item, index) => (
            <div key={`${item.questionId}-${item.num}`} style={itemWrapStyle}>
              <QuestionCard
                question={item.question}
                index={item.num - 1}
                userAnswer={item.userAnswer}
                submitted
                onAnswer={() => {}}
                showPassage={shouldShowReadingPassage(item.question, questions, index)}
              />
              <div style={answerCompareStyle}>
                <p style={wrongAnswerStyle}>
                  내 답안: {formatStoredUserAnswer(item.question, item.userAnswer)}
                </p>
                <p style={correctAnswerStyle}>정답: {item.correctAnswer}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={footerStyle}>
        {mode === "modal" && onClose && (
          <button type="button" onClick={onClose} style={secondaryBtnStyle}>
            닫기
          </button>
        )}
        {showStartButton && onStartExam && (
          <button type="button" onClick={onStartExam} style={primaryBtnStyle}>
            학습 완료 · 재시험 시작하기
          </button>
        )}
      </div>
    </>
  );

  if (mode === "modal") {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(event) => event.stopPropagation()} role="dialog">
          {content}
        </div>
      </div>
    );
  }

  return <div style={inlineWrapStyle}>{content}</div>;
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 1100,
};

const modalStyle = {
  width: "min(760px, 100%)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
};

const inlineWrapStyle = {
  marginTop: 16,
  padding: "18px 20px",
  borderRadius: 12,
  background: "#fffbeb",
  border: "1px solid #fde68a",
};

const headerStyle = {
  marginBottom: 16,
};

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const itemWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const answerCompareStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const wrongAnswerStyle = {
  margin: "0 0 6px",
  color: "#b91c1c",
  fontWeight: 700,
  fontSize: 14,
};

const correctAnswerStyle = {
  margin: 0,
  color: "#047857",
  fontWeight: 700,
  fontSize: 14,
};

const footerStyle = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  flexWrap: "wrap",
  marginTop: 20,
};

const primaryBtnStyle = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  ...primaryBtnStyle,
  background: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
};
