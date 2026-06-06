import { useCallback, useEffect, useMemo, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import SiteHeader from "../components/SiteHeader";
import StudentReadingTest from "./student/StudentReadingTest";
import { getQuestionsByTestId, TESTS } from "../data/questions";
import {
  fetchAllResults,
  formatDate,
  saveResult,
} from "../services/resultsApi";
import { flattenQuestions, gradeQuestion } from "../utils/grade";
import { getReadingTestSet } from "../utils/readingTestData";

export default function StudentApp({ student, onLogout }) {
  const studentKey = student.id;

  const [selectedTestId, setSelectedTestId] = useState("vocab");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
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

  const readingTestSet = useMemo(() => {
    if (selectedTestId !== "reading") return null;
    return getReadingTestSet();
  }, [selectedTestId]);

  const baseQuestions = useMemo(
    () => getQuestionsByTestId(selectedTestId),
    [selectedTestId]
  );

  const flatQuestions = useMemo(() => {
    if (selectedTestId === "reading" && readingTestSet) {
      return readingTestSet.questions;
    }
    return flattenQuestions(baseQuestions);
  }, [selectedTestId, readingTestSet, baseQuestions]);

  const total = flatQuestions.length;
  const selectedTest = TESTS.find((t) => t.id === selectedTestId);
  const isReadingMode = selectedTestId === "reading" && readingTestSet;
  const firstReadingId = flatQuestions.find((q) => q.type === "fill")?.readingId;

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setShowScorePanel(false);
  };

  const submit = async () => {
    let s = 0;
    const details = flatQuestions.map((q, idx) => {
      const earned = gradeQuestion(q, answers[q.id]);
      s += earned;
      return { num: idx + 1, correct: earned === 1 };
    });

    const record = {
      studentId: studentKey,
      studentName: student.name || studentKey,
      testId: selectedTestId,
      testTitle: selectedTest?.title ?? selectedTestId,
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
      setScore(s);
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

  const testDescription = {
    vocab: "뜻 30문항 + 철자 30문항 (총 60문항)",
    writing: "문장 단어 배열 10문항",
    grammar: "객관식 7문항 + 주관식 3문항",
    reading: "지문 분할 화면 · 한 문제씩 집중 풀이",
  };

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
          subtitle={`${student.name} (${student.id})`}
          onLogout={onLogout}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {TESTS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTestId(t.id);
                  setAnswers({});
                  setSubmitted(false);
                  setScore(null);
                  setShowScorePanel(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  background:
                    !showScorePanel && selectedTestId === t.id ? "#2563eb" : "white",
                  color: !showScorePanel && selectedTestId === t.id ? "white" : "black",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {t.title}
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
                  gridTemplateColumns: "minmax(280px, 1fr) minmax(220px, 320px)",
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
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: "#2563eb",
                        marginBottom: 8,
                      }}
                    >
                      {selectedResult.score} / {selectedResult.total}
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        maxHeight: 360,
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

        {!showScorePanel && (
          <div
            style={{
              background: isReadingMode ? "transparent" : "white",
              borderRadius: 12,
              padding: isReadingMode ? 0 : 20,
              boxShadow: isReadingMode ? "none" : "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            <p style={{ margin: "0 0 16px", color: "#64748b" }}>
              <strong>{selectedTest?.title}</strong> · {testDescription[selectedTestId]} ·
              문항당 1점 (총 {total}점)
            </p>

            {isReadingMode ? (
              <StudentReadingTest
                passage={readingTestSet.passage}
                questions={readingTestSet.questions}
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
                      showPassage={
                        q.type === "fill" && q.readingId === firstReadingId && q.num === 1
                      }
                      showWordBank={
                        q.type === "fill" && q.readingId === firstReadingId && q.num === 1
                      }
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
