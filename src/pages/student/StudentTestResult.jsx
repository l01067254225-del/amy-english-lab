import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import StudentLevelCompareDashboard from "../../components/StudentLevelCompareDashboard";
import { fetchAllResults, formatDate } from "../../services/resultsApi";
import { getStudentLevel } from "../../utils/levelStats";
import { ensureArray } from "../../utils/safeData";

export default function StudentTestResult({ student, resultId, onBack, onLogout }) {
  const studentKey = student?.id ?? "";
  const studentLevel = student?.level || getStudentLevel(studentKey);
  const [savedResults, setSavedResults] = useState([]);

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

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <SiteHeader
          title="AMY ENGLISH LAB"
          subtitle={`${student?.name ?? "학생"} · 시험 결과`}
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
            <div style={resultHeaderStyle}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22, color: "#0f172a" }}>
                  {result.testTitle}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                  {formatDate(result.submittedAt)} · {result.score}/{result.total}점
                </p>
              </div>
              <div style={scoreBadgeStyle}>
                {Math.round((result.score / result.total) * 100)}%
              </div>
            </div>

            <StudentLevelCompareDashboard
              studentId={studentKey}
              result={result}
              level={studentLevel}
            />

            <h3 style={detailTitleStyle}>문항별 결과</h3>
            <ul style={detailListStyle}>
              {ensureArray(result.details).map((d) => (
                <li
                  key={d.num}
                  style={{
                    ...detailItemStyle,
                    color: d.correct ? "#047857" : "#b91c1c",
                  }}
                >
                  <span>Q{d.num}</span>
                  <span style={{ fontWeight: 800 }}>{d.correct ? "O" : "X"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
