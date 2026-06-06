import { useEffect, useMemo, useState } from "react";
import QuestionCard from "../../components/QuestionCard";
import SiteHeader from "../../components/SiteHeader";
import StudentReadingTest from "./StudentReadingTest";
import { fetchAllResults, replaceResult, saveResult } from "../../services/resultsApi";
import {
  buildExamTakeView,
  shouldShowReadingPassage,
} from "../../utils/examTakeView";
import {
  clearExamDraft,
  loadExamDraft,
  saveExamDraft,
} from "../../utils/examDraftStorage";
import {
  EXAM_SUBMISSION_INCOMPLETE_MESSAGE,
  ExamSubmissionValidationError,
  validateExamAnswers,
} from "../../utils/examSubmissionValidation";
import { gradeQuestion } from "../../utils/grade";
import { formatTestDate } from "../../utils/levels";
import { loadExamSets } from "../../utils/questionBankStorage";
import { ensureArray } from "../../utils/safeData";
import { shuffleArray } from "../../utils/shuffle";

const REFRESH_WARNING =
  "지금 새로고침하면 시험 내용이 초기화될 수 있습니다. 정말 하시겠습니까?";

export default function StudentExamTake({
  student,
  examId,
  isRetest = false,
  retestResultId = null,
  onBack,
  onSubmitted,
  onLogout,
}) {
  const studentKey = student.id;

  const exam = useMemo(
    () => ensureArray(loadExamSets()).find((item) => item?.id === examId) ?? null,
    [examId]
  );

  const orderedQuestions = useMemo(() => {
    const questions = ensureArray(exam?.questions);
    if (!questions.length) return [];
    if (isRetest) return shuffleArray(questions);
    return questions;
  }, [exam, examId, isRetest]);

  const examView = useMemo(() => {
    if (!orderedQuestions.length) return null;
    return buildExamTakeView(orderedQuestions);
  }, [orderedQuestions]);

  const flatQuestions = examView?.questions ?? [];
  const total = flatQuestions.length;
  const isReadingMode = examView?.mode === "reading";

  const [answers, setAnswers] = useState(() => {
    const draft = loadExamDraft(studentKey, examId);
    return draft?.answers ?? {};
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (submitted) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = REFRESH_WARNING;
      return REFRESH_WARNING;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [submitted]);

  useEffect(() => {
    if (submitted) return;
    saveExamDraft(studentKey, examId, answers);
  }, [answers, examId, studentKey, submitted]);

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    clearExamDraft(studentKey, examId);
  };

  const submit = async () => {
    if (!exam || saving) return;

    const answerCheck = validateExamAnswers(flatQuestions, answers);
    if (!answerCheck.valid) {
      alert(EXAM_SUBMISSION_INCOMPLETE_MESSAGE);
      return;
    }

    let score = 0;
    const details = flatQuestions.map((q, idx) => {
      const earned = gradeQuestion(q, answers[q.id]);
      score += earned;
      return {
        num: idx + 1,
        questionId: q.id,
        correct: earned === 1,
      };
    });

    const baseRecord = {
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
      let attemptCount = 1;
      if (isRetest && retestResultId) {
        const all = await fetchAllResults();
        const existing = all.find((item) => item.id === retestResultId);
        attemptCount = Number(existing?.attemptCount ?? 1) + 1;
      }

      const record = { ...baseRecord, attemptCount, answers };
      const next =
        isRetest && retestResultId
          ? await replaceResult(retestResultId, record)
          : await saveResult(record);

      const mine = next.filter(
        (r) => r.studentId === studentKey || r.studentName === studentKey
      );
      const targetId = isRetest && retestResultId ? retestResultId : mine[0]?.id;
      setSubmitted(true);
      clearExamDraft(studentKey, examId);
      if (targetId) {
        onSubmitted?.(targetId);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof ExamSubmissionValidationError) {
        alert(error.message);
      } else {
        alert("제출 저장에 실패했습니다.");
      }
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
          subtitle={`${exam.title} · ${exam.targetLevel} · ${formatTestDate(exam.testDate)}${isRetest ? " · 재시험" : ""}`}
          onLogout={onLogout}
        />

        <button type="button" onClick={onBack} style={backBtnStyle}>
          ← {isRetest ? "결과 화면으로" : "대시보드로 돌아가기"}
        </button>

        {isRetest && (
          <p style={retestBannerStyle}>
            재시험 모드 · 문항 순서가 무작위로 섞였습니다. 커트라인 통과 후 오답 노트를
            이용할 수 있습니다.
          </p>
        )}

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
                    {saving ? "저장 중..." : isRetest ? "재시험 제출" : "제출"}
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

const retestBannerStyle = {
  margin: "0 0 16px",
  padding: "12px 14px",
  borderRadius: 10,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.6,
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
