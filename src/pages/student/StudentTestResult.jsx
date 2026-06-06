import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import IncorrectAnswerTools from "../../components/IncorrectAnswerTools";
import RetestWrongAnswerReview from "../../components/RetestWrongAnswerReview";
import StudentLevelCompareDashboard from "../../components/StudentLevelCompareDashboard";
import { fetchAllResults, formatDate } from "../../services/resultsApi";
import {
  CUTOFF_SCORES,
  evaluateCutoff,
  getCutoffWarningMessage,
} from "../../utils/cutoffPolicy";
import { getStudentLevel } from "../../utils/levelStats";
import { SUBJECT_SMS_LABELS } from "../../utils/scoreAnalytics";
import { ensureArray } from "../../utils/safeData";
import { countRetestReviewItems } from "../../utils/examRetestStorage";

export default function StudentTestResult({
  student,
  resultId,
  onBack,
  onLogout,
  onRetest,
}) {
  const studentKey = student?.id ?? "";
  const studentName = student?.name ?? "학생";
  const studentLevel = student.level || getStudentLevel(studentKey);
  const [savedResults, setSavedResults] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadMyResults = useCallback(async () => {
    try {
      const all = await fetchAllResults();
      const list = ensureArray(all);
      const mine = list.filter(
        (r) => r && (r.studentId === studentKey || r.studentName === studentKey)
      );
      setSavedResults(mine);
      return mine;
    } catch (error) {
      console.error(error);
      setSavedResults([]);
      return [];
    }
  }, [studentKey]);

  useEffect(() => {
    loadMyResults();
  }, [loadMyResults]);

  const result = useMemo(
    () => savedResults.find((r) => r.id === resultId) ?? null,
    [savedResults, resultId]
  );

  const cutoff = useMemo(() => evaluateCutoff(result), [result]);

  const percent = useMemo(() => {
    if (!result || !result.total) return 0;
    return Math.round((Number(result.score) / Number(result.total)) * 100);
  }, [result]);

  const retestReviewCount = useMemo(
    () => (result ? countRetestReviewItems(result) : 0),
    [result]
  );

  const handleRetest = () => {
    if (!result?.testId) return;
    onRetest?.(result.testId, result.id);
  };

  const handleResultUpdate = useCallback((updatedResult) => {
    setSavedResults((prev) =>
      prev.map((entry) => (entry.id === updatedResult.id ? updatedResult : entry))
    );
  }, []);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <SiteHeader
          title="AMY ENGLISH LAB"
          subtitle={`${studentName} · 시험 결과`}
          onLogout={onLogout}
        />

        <button type="button" onClick={onBack} style={backBtnStyle}>
          ← 대시보드로 돌아가기
        </button>

        {!result ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: "#64748b" }}>결과를 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div style={cardStyle}>
            {cutoff.passed && (
              <IncorrectAnswerTools
                result={result}
                studentName={studentName}
                showPrint
                showClinic={false}
                onResultUpdate={handleResultUpdate}
              />
            )}

            <div style={resultHeaderStyle}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22, color: "#0f172a" }}>
                  {result.testTitle}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                  {formatDate(result.submittedAt)} · {result.score}/{result.total}점
                  {result.attemptCount > 1 ? ` · ${result.attemptCount}회차` : ""}
                </p>
              </div>
              <div
                style={{
                  ...scoreBadgeStyle,
                  ...(cutoff.needsRetest
                    ? { background: "#fef2f2", color: "#b91c1c" }
                    : {}),
                }}
              >
                {percent}%
              </div>
            </div>

            {cutoff.testedSubjects.length > 0 && (
              <div style={subjectScoreGridStyle}>
                {cutoff.testedSubjects.map((subject) => {
                  const score = cutoff.subjectScores[subject];
                  const passed = score >= CUTOFF_SCORES[subject];
                  return (
                    <div key={subject} style={subjectScoreCardStyle}>
                      <span style={subjectScoreLabelStyle}>{SUBJECT_SMS_LABELS[subject]}</span>
                      <strong
                        style={{
                          ...subjectScoreValueStyle,
                          color: passed ? "#047857" : "#b91c1c",
                        }}
                      >
                        {score}점
                      </strong>
                      <span style={subjectCutoffStyle}>
                        기준 {CUTOFF_SCORES[subject]}점 · {passed ? "통과" : "재시험"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {cutoff.needsRetest ? (
              <div style={warningBoxStyle}>
                <p style={{ margin: "0 0 14px", lineHeight: 1.7, fontWeight: 600 }}>
                  {getCutoffWarningMessage(cutoff.failedSubjects)}
                </p>
                <div style={retestActionRowStyle}>
                  {retestReviewCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      style={reviewBtnStyle}
                    >
                      오답 확인하기 ({retestReviewCount}문항)
                    </button>
                  )}
                  <button type="button" onClick={handleRetest} style={retestBtnStyle}>
                    재시험 응시하기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <StudentLevelCompareDashboard
                  studentId={studentKey}
                  result={result}
                  level={studentLevel}
                />

                <h3 style={detailTitleStyle}>문항별 결과</h3>
                <ul style={detailListStyle}>
                  {ensureArray(result.details).map((d) => (
                    <li
                      key={`${d.num}-${d.questionId ?? "legacy"}`}
                      style={{
                        ...detailItemStyle,
                        color: d.correct ? "#047857" : "#b91c1c",
                      }}
                    >
                      <span>
                        Q{d.num}
                        {d.examRetest?.passed && (
                          <span style={examRetestTagStyle}>재시험 통과</span>
                        )}
                        {d.clinicRetest && (
                          <span style={clinicRetestTagStyle}>
                            재응시 {d.clinicRetest.correct ? "O" : "X"}
                          </span>
                        )}
                      </span>
                      <span style={{ fontWeight: 800 }}>{d.correct ? "O" : "X"}</span>
                    </li>
                  ))}
                </ul>

                <IncorrectAnswerTools
                  result={result}
                  studentName={studentName}
                  showPrint={false}
                  showClinic
                  mountPrintSheet={false}
                  onResultUpdate={handleResultUpdate}
                />
              </>
            )}
          </div>
        )}
      </div>

      {reviewOpen && result && (
        <RetestWrongAnswerReview
          result={result}
          studentName={studentName}
          mode="modal"
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 24,
  fontFamily: "'Segoe UI', Arial, sans-serif",
};

const containerStyle = {
  maxWidth: 960,
  margin: "0 auto",
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

const cardStyle = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
};

const resultHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 8,
  marginTop: 16,
  flexWrap: "wrap",
};

const scoreBadgeStyle = {
  padding: "10px 18px",
  borderRadius: 12,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 24,
  fontWeight: 800,
};

const subjectScoreGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
  margin: "16px 0",
};

const subjectScoreCardStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const subjectScoreLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
};

const subjectScoreValueStyle = {
  fontSize: 20,
  fontWeight: 800,
};

const subjectCutoffStyle = {
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 600,
};

const warningBoxStyle = {
  marginTop: 20,
  padding: "18px 20px",
  borderRadius: 12,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};

const retestBtnStyle = {
  padding: "14px 22px",
  borderRadius: 10,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const reviewBtnStyle = {
  ...retestBtnStyle,
  background: "white",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const retestActionRowStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const detailTitleStyle = {
  margin: "20px 0 10px",
  fontSize: 15,
  fontWeight: 800,
  color: "#64748b",
};

const detailListStyle = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 8,
};

const detailItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: 8,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: 14,
};

const clinicRetestTagStyle = {
  display: "block",
  marginTop: 2,
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
};

const examRetestTagStyle = {
  display: "block",
  marginTop: 2,
  fontSize: 11,
  fontWeight: 700,
  color: "#047857",
};
