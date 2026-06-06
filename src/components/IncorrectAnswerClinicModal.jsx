import { useEffect, useMemo, useState } from "react";
import QuestionCard from "./QuestionCard";
import { shouldShowReadingPassage } from "../utils/examTakeView";
import { gradeQuestion } from "../utils/grade";
import {
  canClinicRetest,
  getClinicRetestAttemptCount,
  getClinicRetestRemainingAttempts,
  getClinicRetestSummary,
  getIncorrectQuestionItems,
  saveClinicRetestResult,
  CLINIC_RETEST_MAX_ATTEMPTS,
} from "../utils/incorrectAnswerClinic";
import {
  IncorrectAnswerCloseButton,
  IncorrectAnswerRetryButton,
  IncorrectAnswerSubmitButton,
} from "./IncorrectAnswerModalButtons";
import { incorrectAnswerFooterStyle } from "./incorrectAnswerModalStyles";

function buildInitialAnswers(result, items) {
  const attemptCount = getClinicRetestAttemptCount(result);
  if (attemptCount === 0) return {};

  const latestItems = getClinicRetestSummary(result)
    ? result.clinicRetest?.latestAttempt?.items ??
      result.clinicRetest?.items ??
      []
    : [];

  const byQuestionId = new Map(
    latestItems.map((item) => [item.questionId, item.userAnswer])
  );

  return Object.fromEntries(
    items.map((item) => [item.question.id, byQuestionId.get(item.question.id) ?? ""])
  );
}

export default function IncorrectAnswerClinicModal({
  result,
  studentName,
  onClose,
  onSaved,
}) {
  const items = useMemo(() => getIncorrectQuestionItems(result), [result]);
  const questions = useMemo(() => items.map((item) => item.question), [items]);

  const [workingResult, setWorkingResult] = useState(result);
  const [answers, setAnswers] = useState(() => buildInitialAnswers(result, items));
  const [submitted, setSubmitted] = useState(() => getClinicRetestAttemptCount(result) > 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWorkingResult(result);
  }, [result]);

  const remainingAttempts = useMemo(
    () => getClinicRetestRemainingAttempts(workingResult),
    [workingResult]
  );
  const canRetry = useMemo(
    () => submitted && canClinicRetest(workingResult),
    [submitted, workingResult]
  );

  const setAnswer = (qid, value) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = () => {
    if (submitted || saving || !canClinicRetest(workingResult)) return;

    setSaving(true);
    try {
      const updated = saveClinicRetestResult(workingResult, items, answers);
      setWorkingResult(updated);
      setSubmitted(true);
      onSaved?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    if (!canRetry) return;
    setSubmitted(false);
  };

  const scoreSummary = useMemo(() => {
    if (!submitted) return null;

    const summary = getClinicRetestSummary(workingResult);
    if (summary) {
      return {
        correct: summary.correctCount,
        total: summary.totalCount,
      };
    }

    let correct = 0;
    items.forEach((item) => {
      if (gradeQuestion(item.question, answers[item.question.id]) === 1) {
        correct += 1;
      }
    });
    return { correct, total: items.length };
  }, [submitted, workingResult, items, answers]);

  if (!result || items.length === 0) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <p style={{ margin: 0, color: "#64748b" }}>오답 문항이 없습니다.</p>
          <div style={incorrectAnswerFooterStyle}>
            <IncorrectAnswerCloseButton onClick={onClose} />
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
              {studentName || "학생"} · {result.testTitle} · 오답 {items.length}문항 · 최대{" "}
              {CLINIC_RETEST_MAX_ATTEMPTS}회 · 남은 {remainingAttempts}회
            </p>
          </div>
        </div>

        {submitted && scoreSummary && (
          <div style={summaryBannerStyle}>
            재응시 결과: {scoreSummary.correct}/{scoreSummary.total} 정답
            {canRetry
              ? ` · 오답 문항이 남았습니다. 다시 풀기 (남은 횟수: ${remainingAttempts}회)`
              : remainingAttempts <= 0
                ? " · 재응시 횟수를 모두 사용했습니다."
                : " · 모든 오답을 맞혔습니다!"}
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
          {!submitted ? (
            <>
              <IncorrectAnswerCloseButton onClick={onClose} disabled={saving} />
              <IncorrectAnswerSubmitButton onClick={handleSubmit} disabled={saving} />
            </>
          ) : (
            <>
              {canRetry && (
                <IncorrectAnswerRetryButton onClick={handleRetry} />
              )}
              <IncorrectAnswerCloseButton onClick={onClose} />
            </>
          )}
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
