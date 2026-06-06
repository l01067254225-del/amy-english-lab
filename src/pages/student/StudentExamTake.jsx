import { useMemo, useState } from "react";
import QuestionCard from "../../components/QuestionCard";
import SiteHeader from "../../components/SiteHeader";
import StudentReadingTest from "./StudentReadingTest";
import { saveResult } from "../../services/resultsApi";
import {
  buildExamTakeView,
  shouldShowReadingPassage,
} from "../../utils/examTakeView";
import { gradeQuestion } from "../../utils/grade";
import { formatTestDate } from "../../utils/levels";
import { loadExamSets } from "../../utils/questionBankStorage";
import { ensureArray } from "../../utils/safeData";

export default function StudentExamTake({
  student,
  examId,
  onBack,
  onSubmitted,
  onLogout,
}) {
  const studentKey = student.id;

  const exam = useMemo(
    () => ensureArray(loadExamSets()).find((item) => item?.id === examId) ?? null,
    [examId]
  );

  const examView = useMemo(() => {
    if (!exam) return null;
    return buildExamTakeView(exam.questions);
  }, [exam]);

  const flatQuestions = examView?.questions ?? [];
  const total = flatQuestions.length;
  const isReadingMode = examView?.mode === "reading";

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const submit = async () => {
    if (!exam) return;

    let score = 0;
    const details = flatQuestions.map((q, idx) => {
      const earned = gradeQuestion(q, answers[q.id]);
      score += earned;
      return { num: idx + 1, correct: earned === 1 };
    });

    const record = {
      studentId: studentKey,
      studentName: student.name || studentKey,
      testId: exam.id,
      testTitle: exam.title,
      score,
      total,
      submittedAt: new Date().toISOString(),
      details,
    };

    setSaving(true);
    try {
      const next = await saveResult(record);
      const mine = next.filter(
        (r) => r.studentId === studentKey || r.studentName === studentKey
      );
      const latest = mine[0];
      setSubmitted(true);
      if (latest?.id) {
        onSubmitted?.(latest.id);
      }
    } catch (error) {
      console.error(error);
      alert("제출 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!exam) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <SiteHeader title="AMY ENGLISH LAB" onLogout={onLogout} />
          <button type="button" onClick={onBack} style={backBtnStyle}>
            ← 대시보드로 돌아가기
          </button>
          <p style={{ color: "#64748b" }}>시험 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: isReadingMode ? 1280 : 960, margin: "0 auto" }}>
        <SiteHeader
          title="AMY ENGLISH LAB"
          subtitle={`${exam.title} · ${exam.targetLevel} · ${formatTestDate(exam.testDate)}`}
          onLogout={onLogout}
        />

        <button type="button" onClick={onBack} style={backBtnStyle}>
          ← 대시보드로 돌아가기
        </button>

        <div
          style={{
            background: isReadingMode ? "transparent" : "white",
            borderRadius: 16,
            padding: isReadingMode ? 0 : 24,
            boxShadow: isReadingMode ? "none" : "0 4px 20px rgba(15, 23, 42, 0.06)",
            border: isReadingMode ? "none" : "1px solid #e2e8f0",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "#64748b" }}>
            문항당 1점 · 총 {total}점
          </p>

          {isReadingMode ? (
            <StudentReadingTest
              passage={examView.passage}
              questions={flatQuestions}
              answers={answers}
              submitted={submitted}
              saving={saving}
              onAnswer={setAnswer}
              onSubmit={submit}
              onReset={reset}
            />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {flatQuestions.map((q, idx) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    userAnswer={answers[q.id] ?? ""}
                    submitted={submitted}
                    onAnswer={setAnswer}
                    showPassage={shouldShowReadingPassage(q, flatQuestions, idx)}
                  />
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                {!submitted ? (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    style={submitBtnStyle}
                  >
                    {saving ? "저장 중..." : "제출"}
                  </button>
                ) : (
                  <button type="button" onClick={reset} style={secondaryBtnStyle}>
                    다시 풀기
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 24,
  fontFamily: "'Segoe UI', Arial, sans-serif",
};

const backBtnStyle = {
  marginBottom: 16,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const submitBtnStyle = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryBtnStyle = {
  ...submitBtnStyle,
  background: "white",
  color: "#334155",
  border: "1px solid #ddd",
};
