import { useMemo, useState } from "react";
import QuestionCard from "./QuestionCard";
import { shouldShowReadingPassage } from "../utils/examTakeView";
import { gradeQuestion } from "../utils/grade";
import { getIncorrectQuestionItems } from "../utils/incorrectAnswerClinic";
import {
  incorrectAnswerCloseBtnStyle,
  incorrectAnswerFooterStyle,
  incorrectAnswerPrimaryBtnStyle,
  incorrectAnswerSecondaryBtnStyle,
} from "./incorrectAnswerModalStyles";

export default function IncorrectAnswerClinicModal({ result, studentName, onClose }) {
  const items = useMemo(() => getIncorrectQuestionItems(result), [result]);
  const questions = useMemo(() => items.map((item) => item.question), [items]);

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const handleClearAnswers = () => {
    setAnswers({});
  };

  const scoreSummary = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;
    items.forEach((item) => {
      if (gradeQuestion(item.question, answers[item.question.id]) === 1) {
        correct += 1;
      }
    });
    return { correct, total: items.length };
  }, [submitted, items, answers]);

  if (!result || items.length === 0) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <p style={{ margin: 0, color: "#64748b" }}>오답 문항이 없습니다.</p>
          <div style={incorrectAnswerFooterStyle}>
            <button type="button" onClick={onClose} style={incorrectAnswerCloseBtnStyle}>
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={headerRowStyle}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a" }}>
              오답 노트 온라인 재응시
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              {studentName || "학생"} · {result.testTitle} · 오답 {items.length}문항
            </p>
          </div>
          {!submitted ? (
            <button type="button" onClick={handleSubmit} style={incorrectAnswerPrimaryBtnStyle}>
              제출
            </button>
          ) : null}
        </div>

        {submitted && scoreSummary && (
          <div style={summaryBannerStyle}>
            재응시 결과: {scoreSummary.correct}/{scoreSummary.total} 정답
          </div>
        )}

        <div style={questionListStyle}>
          {items.map((item, index) => (
            <QuestionCard
              key={`${item.question.id}-${item.num}`}
              question={item.question}
              index={item.num - 1}
              userAnswer={answers[item.question.id] ?? ""}
              submitted={submitted}
              onAnswer={setAnswer}
              showPassage={shouldShowReadingPassage(item.question, questions, index)}
            />
          ))}
        </div>

        <div style={incorrectAnswerFooterStyle}>
          <button
            type="button"
            onClick={submitted ? handleRetry : handleClearAnswers}
            style={incorrectAnswerSecondaryBtnStyle}
          >
            다시 풀기
          </button>
          <button type="button" onClick={onClose} style={incorrectAnswerCloseBtnStyle}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
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

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};

const questionListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginBottom: 4,
};

const summaryBannerStyle = {
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 10,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontWeight: 800,
  textAlign: "center",
};
