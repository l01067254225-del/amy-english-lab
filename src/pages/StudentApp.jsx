import { useCallback, useEffect, useMemo, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import SiteHeader from "../components/SiteHeader";
import StudentLevelCompareDashboard from "../components/StudentLevelCompareDashboard";
import StudentReadingTest from "./student/StudentReadingTest";
import {
  fetchAllResults,
  formatDate,
  saveResult,
} from "../services/resultsApi";
import {
  buildExamTakeView,
  shouldShowReadingPassage,
} from "../utils/examTakeView";
import { gradeQuestion } from "../utils/grade";
import { getStudentLevel } from "../utils/levelStats";
import { formatTestDate, getTodayDateString } from "../utils/levels";
import { getAvailableExamsForStudent } from "../utils/questionBankStorage";

export default function StudentApp({ student, onLogout }) {
  const studentKey = student.id;
  const today = getTodayDateString();
  const studentLevel = student.level || getStudentLevel(studentKey);

  const availableExams = useMemo(
    () => getAvailableExamsForStudent(studentLevel, today),
    [studentLevel, today]
  );

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showScorePanel, setShowScorePanel] = useState(false);
  const [savedResults, setSavedResults] = useState([]);
  const [selectedResultId, setSelectedResultId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadMyResults = useCallback(async () => {
    const all = await fetchAllResults();
    const mine = all.filter(
      (r) => r.studentId === studentKey || r.studentName === studentKey
    );
    setSavedResults(mine);
    return mine;
  }, [studentKey]);

  useEffect(() => {
    loadMyResults();
  }, [loadMyResults]);

  useEffect(() => {
    if (availableExams.length === 0) {
      setSelectedExamId(null);
      return;
    }
    if (!availableExams.some((exam) => exam.id === selectedExamId)) {
      setSelectedExamId(availableExams[0].id);
    }
  }, [availableExams, selectedExamId]);

  const selectedExam =
    availableExams.find((exam) => exam.id === selectedExamId) ?? availableExams[0] ?? null;

  const examView = useMemo(() => {
    if (!selectedExam) return null;
    return buildExamTakeView(selectedExam.questions);
  }, [selectedExam]);

  const flatQuestions = examView?.questions ?? [];
  const total = flatQuestions.length;
  const isReadingMode = examView?.mode === "reading";

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const resetExamState = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const reset = () => {
    resetExamState();
    setShowScorePanel(false);
  };

  const handleSelectExam = (examId) => {
    setSelectedExamId(examId);
    resetExamState();
    setShowScorePanel(false);
  };

  const submit = async () => {
    if (!selectedExam) return;

    let s = 0;
    const details = flatQuestions.map((q, idx) => {
      const earned = gradeQuestion(q, answers[q.id]);
      s += earned;
      return { num: idx + 1, correct: earned === 1 };
    });

    const record = {
      studentId: studentKey,
      studentName: student.name || studentKey,
      testId: selectedExam.id,
      testTitle: selectedExam.title,
      score: s,
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
      setSavedResults(mine);
      setSelectedResultId(mine[0]?.id ?? null);
      setSubmitted(true);
      setShowScorePanel(true);
    } catch (error) {
      console.error(error);
      alert("제출 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenResults = async () => {
    const willOpen = !showScorePanel;
    setShowScorePanel(willOpen);
    if (willOpen) {
      const mine = await loadMyResults();
      setSelectedResultId(mine[0]?.id ?? null);
    }
  };

  const selectedResult =
    savedResults.find((r) => r.id === selectedResultId) ?? savedResults[0] ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: isReadingMode ? 1280 : 1000, margin: "0 auto" }}>
        <SiteHeader
          title="AMY ENGLISH LAB"
          subtitle={`${student.name} (${student.id}) · ${studentLevel || "레벨 미지정"} · ${formatTestDate(today)}`}
          onLogout={onLogout}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {availableExams.map((exam) => (
              <button
                key={exam.id}
                type="button"
                onClick={() => handleSelectExam(exam.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  background:
                    !showScorePanel && selectedExam?.id === exam.id ? "#2563eb" : "white",
                  color:
                    !showScorePanel && selectedExam?.id === exam.id ? "white" : "black",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {exam.title}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenResults}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: showScorePanel ? "#2563eb" : "white",
              color: showScorePanel ? "white" : "black",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Test Result
          </button>
        </div>

        {showScorePanel && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Test Result</h2>

            {savedResults.length === 0 ? (
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.5 }}>
                아직 제출한 시험이 없습니다.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>
                    내 기록 ({savedResults.length}건)
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {savedResults.map((r) => (
                      <li key={r.id} style={{ marginBottom: 8 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedResultId(r.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 10,
                            border:
                              selectedResult?.id === r.id
                                ? "2px solid #2563eb"
                                : "1px solid #e2e8f0",
                            background:
                              selectedResult?.id === r.id ? "#eff6ff" : "#f8fafc",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            <span>{r.testTitle}</span>
                            <span style={{ color: "#2563eb" }}>
                              {r.score}/{r.total}
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {formatDate(r.submittedAt)}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedResult && (
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <p style={{ margin: "0 0 12px", color: "#475569" }}>
                      시험: <strong>{selectedResult.testTitle}</strong>
                    </p>

                    <StudentLevelCompareDashboard
                      studentId={studentKey}
                      result={selectedResult}
                      level={studentLevel}
                    />

                    <p
                      style={{
                        margin: "16px 0 8px",
                        color: "#64748b",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      문항별 결과
                    </p>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        maxHeight: 280,
                        overflow: "auto",
                      }}
                    >
                      {selectedResult.details.map((d) => (
                        <li
                          key={d.num}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 8px",
                            marginBottom: 4,
                            borderRadius: 6,
                            background: "white",
                            color: d.correct ? "#047857" : "#b91c1c",
                            fontSize: 14,
                          }}
                        >
                          <span>Q{d.num}</span>
                          <span>{d.correct ? "O" : "X"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!showScorePanel && availableExams.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>
              오늘 응시할 시험이 없습니다
            </h2>
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.7 }}>
              {studentLevel
                ? `${studentLevel} 레벨 · ${formatTestDate(today)} 기준으로`
                : "레벨 정보가 없어"}{" "}
              배정된 시험이 없습니다.
              <br />
              다른 날짜나 레벨의 시험은 표시되지 않습니다.
            </p>
          </div>
        )}

        {!showScorePanel && selectedExam && examView && (
          <div
            style={{
              background: isReadingMode ? "transparent" : "white",
              borderRadius: 12,
              padding: isReadingMode ? 0 : 20,
              boxShadow: isReadingMode ? "none" : "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            <p style={{ margin: "0 0 16px", color: "#64748b" }}>
              <strong>{selectedExam.title}</strong> · {selectedExam.targetLevel} ·{" "}
              {formatTestDate(selectedExam.testDate)} · 문항당 1점 (총 {total}점)
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
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: saving ? "#94a3b8" : "#2563eb",
                        color: "white",
                        cursor: saving ? "wait" : "pointer",
                        fontWeight: 800,
                      }}
                    >
                      {saving ? "저장 중..." : "제출"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={reset}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      다시 풀기
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
