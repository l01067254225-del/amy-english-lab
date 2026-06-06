import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import { deleteResult, fetchAllResults, formatDate } from "../../services/resultsApi";
import { getExamQuestionCount, getExamSubjectSummary } from "../../utils/examHelpers";
import { getStudentLevel } from "../../utils/levelStats";
import { formatTestDate, formatLevelLabel, getTodayDateString } from "../../utils/levels";
import { getAvailableExamsForStudent } from "../../utils/questionBankStorage";
import { ensureArray } from "../../utils/safeData";
import { getStudentExamStatus } from "../../utils/studentExamStatus";

export default function StudentDashboard({
  student,
  onLogout,
  onStartExam,
  onViewResult,
}) {
  const studentKey = student?.id ?? "";
  const studentName = student?.name || studentKey || "학생";
  const today = getTodayDateString();
  const studentLevel = student.level || getStudentLevel(studentKey);

  const [savedResults, setSavedResults] = useState([]);

  const availableExams = useMemo(
    () => ensureArray(getAvailableExamsForStudent(studentLevel, today)),
    [studentLevel, today]
  );

  const loadMyResults = useCallback(async () => {
    try {
      const all = await fetchAllResults();
      const list = ensureArray(all);
      const mine = list
        .filter((r) => r && (r.studentId === studentKey || r.studentName === studentKey))
        .sort(
          (a, b) =>
            new Date(b?.submittedAt || 0).getTime() -
            new Date(a?.submittedAt || 0).getTime()
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

  const handleDeleteZeroScore = async (result) => {
    if (Number(result?.score) !== 0) return;
    const confirmed = window.confirm(
      `"${result.testTitle}" 0점 기록을 삭제할까요? 삭제 후에는 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      await deleteResult(result.id);
      setSavedResults((prev) => prev.filter((entry) => entry.id !== result.id));
    } catch (error) {
      console.error(error);
      alert("시험 기록 삭제에 실패했습니다.");
    }
  };

  const examStatusById = useMemo(() => {
    const map = new Map();
    availableExams.forEach((exam) => {
      map.set(exam.id, getStudentExamStatus(exam.id, savedResults, studentKey));
    });
    return map;
  }, [availableExams, savedResults, studentKey]);

  const handleStartExam = (examId) => {
    const status = examStatusById.get(examId);
    if (status?.complete) return;
    onStartExam?.(examId);
  };

  const greeting = studentLevel
    ? `안녕하세요, ${studentName} 학생 (레벨: ${formatLevelLabel(studentLevel)})`
    : `안녕하세요, ${studentName} 학생`;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <SiteHeader
          title="AMY ENGLISH LAB"
          subtitle={`${greeting} · ${formatTestDate(today)}`}
          onLogout={onLogout}
        />

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>오늘의 시험</h2>
            <span style={sectionBadgeStyle}>Active Tests</span>
          </div>

          {availableExams.length === 0 ? (
            <div style={emptyCardStyle}>
              <p style={emptyTextStyle}>
                오늘 예정된 시험이 없습니다. 좋은 하루 보내세요! 👍
              </p>
            </div>
          ) : (
            <div style={activeListStyle}>
              {availableExams.map((exam) => {
                const status = examStatusById.get(exam.id);
                const isComplete = Boolean(status?.complete);

                return (
                  <article
                    key={exam.id}
                    style={{
                      ...activeCardStyle,
                      ...(isComplete ? activeCardCompleteStyle : {}),
                    }}
                  >
                    <div style={activeCardBodyStyle}>
                      <h3 style={examTitleStyle}>{exam.title}</h3>
                      <div style={examMetaRowStyle}>
                        <span style={metaPillStyle}>{getExamSubjectSummary(exam)}</span>
                        <span style={metaTextStyle}>
                          {getExamQuestionCount(exam)}문항
                        </span>
                        {isComplete && (
                          <span style={completeBadgeStyle}>오답 완료</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartExam(exam.id)}
                      disabled={isComplete}
                      style={isComplete ? completedBtnStyle : startBtnStyle}
                    >
                      {isComplete ? "완료됨" : "시험 시작하기"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>지난 시험 이력</h2>
            <span style={sectionBadgeMutedStyle}>Test History</span>
          </div>

          {savedResults.length === 0 ? (
            <div style={emptyCardStyle}>
              <p style={emptyTextStyle}>등록된 시험 이력이 없습니다.</p>
            </div>
          ) : (
            <div style={historyCardStyle}>
              <table style={historyTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>시험 날짜</th>
                    <th style={thStyle}>시험 제목</th>
                    <th style={thStyle}>점수</th>
                    <th style={{ ...thStyle, width: 180, textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {savedResults.map((result) => (
                    <tr key={result.id}>
                      <td style={tdStyle}>{formatDate(result.submittedAt)}</td>
                      <td style={tdStyle}>
                        <strong style={{ color: "#0f172a" }}>{result.testTitle}</strong>
                      </td>
                      <td style={tdStyle}>
                        <span style={scoreStyle}>
                          {result.score} / {result.total}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={historyActionRowStyle}>
                          {Number(result.score) === 0 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteZeroScore(result)}
                              style={deleteBtnStyle}
                            >
                              삭제
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewResult(result.id)}
                            style={resultBtnStyle}
                          >
                            결과 보기
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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

const containerStyle = {
  maxWidth: 960,
  margin: "0 auto",
};

const sectionStyle = {
  marginBottom: 28,
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const sectionBadgeStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
};

const sectionBadgeMutedStyle = {
  ...sectionBadgeStyle,
  background: "#f1f5f9",
  color: "#64748b",
};

const emptyCardStyle = {
  background: "white",
  borderRadius: 16,
  padding: "32px 24px",
  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
  textAlign: "center",
};

const emptyTextStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.7,
};

const activeListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const activeCardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
  background: "white",
  borderRadius: 16,
  padding: "22px 24px",
  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.08)",
  border: "1px solid #dbeafe",
};

const activeCardBodyStyle = {
  flex: 1,
  minWidth: 220,
};

const examTitleStyle = {
  margin: "0 0 10px",
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const examMetaRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const metaPillStyle = {
  padding: "4px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 13,
  fontWeight: 700,
};

const metaTextStyle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 600,
};

const startBtnStyle = {
  padding: "14px 24px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "white",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
};

const completedBtnStyle = {
  ...startBtnStyle,
  background: "#e2e8f0",
  color: "#64748b",
  boxShadow: "none",
  cursor: "not-allowed",
  opacity: 0.95,
};

const activeCardCompleteStyle = {
  borderColor: "#e2e8f0",
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
  background: "#f8fafc",
};

const completeBadgeStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#047857",
  fontSize: 12,
  fontWeight: 700,
};

const historyCardStyle = {
  background: "white",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
};

const historyTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  padding: "14px 18px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 700,
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle = {
  padding: "16px 18px",
  fontSize: 14,
  color: "#475569",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const scoreStyle = {
  fontWeight: 800,
  color: "#2563eb",
};

const historyActionRowStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const resultBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const deleteBtnStyle = {
  ...resultBtnStyle,
  borderColor: "#fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
};
