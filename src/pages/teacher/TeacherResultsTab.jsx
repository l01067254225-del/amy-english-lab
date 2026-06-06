import { useMemo, useState } from "react";
import ScoreReportPrintModal from "../../components/ScoreReportPrintModal";
import { formatDate } from "../../services/resultsApi";
import { getSubjectSummaryForTestId } from "../../utils/examHelpers";
import { LEVEL_OPTIONS } from "../../utils/levels";
import { ensureArray } from "../../utils/safeData";
import {
  btnSecondary,
  inputStyle,
  sectionTitle,
  summaryCard,
  tableStyle,
  thTdStyle,
} from "./teacherStyles";

export default function TeacherResultsTab({
  students,
  results,
  loading,
  onRefresh,
  onClearAll,
}) {
  const [levelFilter, setLevelFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");
  const [printTarget, setPrintTarget] = useState(null);

  const safeStudents = ensureArray(students);
  const safeResults = ensureArray(results);

  const studentMap = useMemo(() => {
    const map = new Map();
    safeStudents.forEach((student) => {
      if (student?.id) map.set(student.id, student);
    });
    return map;
  }, [safeStudents]);

  const registryRows = useMemo(() => {
    return safeResults
      .map((result) => {
        if (!result) return null;
        const student =
          studentMap.get(result.studentId) ??
          safeStudents.find((item) => item.name === result.studentName);
        return {
          ...result,
          level: student?.level?.trim() || "—",
          subject: getSubjectSummaryForTestId(result.testId),
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
  }, [safeResults, studentMap, safeStudents]);

  const filteredRows = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return registryRows.filter((row) => {
      if (levelFilter !== "all" && row.level !== levelFilter) return false;
      if (!query) return true;
      return (
        String(row.studentName ?? "").toLowerCase().includes(query) ||
        String(row.studentId ?? "").toLowerCase().includes(query)
      );
    });
  }, [registryRows, levelFilter, nameQuery]);

  const printRow = printTarget
    ? registryRows.find((row) => row.id === printTarget.id) ?? printTarget
    : null;

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={onRefresh} style={btnSecondary} disabled={loading}>
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
        <button
          type="button"
          onClick={onClearAll}
          style={{ ...btnSecondary, color: "#b91c1c", borderColor: "#fecaca" }}
        >
          전체 성적 삭제
        </button>
      </div>

      <div style={summaryCard}>
        <h2 style={sectionTitle}>전체 성적 목록</h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", lineHeight: 1.6 }}>
          모든 학생의 시험 제출 기록을 조회하고, 성적표를 인쇄할 수 있습니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 700, color: "#334155" }}>
            레벨 필터
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ ...inputStyle, marginTop: 0 }}
            >
              <option value="all">전체 레벨</option>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 700, color: "#334155" }}>
            학생 이름 검색
            <input
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="이름 또는 ID 검색"
              style={{ ...inputStyle, marginTop: 0 }}
            />
          </label>
        </div>

        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#64748b" }}>
          총 {filteredRows.length}건
          {levelFilter !== "all" || nameQuery.trim() ? " (필터 적용됨)" : ""}
        </p>

        {safeResults.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>등록된 성적 데이터가 없습니다.</p>
        ) : filteredRows.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>조건에 맞는 성적 데이터가 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>시험 날짜</th>
                  <th style={thTdStyle}>이름</th>
                  <th style={thTdStyle}>레벨</th>
                  <th style={thTdStyle}>시험 제목</th>
                  <th style={thTdStyle}>과목</th>
                  <th style={thTdStyle}>점수 / 만점</th>
                  <th style={{ ...thTdStyle, textAlign: "right", width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td style={thTdStyle}>{formatDate(row.submittedAt)}</td>
                    <td style={thTdStyle}>
                      <strong>{row.studentName}</strong>
                    </td>
                    <td style={thTdStyle}>
                      <span style={levelBadgeStyle}>{row.level}</span>
                    </td>
                    <td style={thTdStyle}>{row.testTitle}</td>
                    <td style={thTdStyle}>{row.subject}</td>
                    <td style={thTdStyle}>
                      <span style={scoreHighlightStyle}>
                        {row.score} / {row.total}
                      </span>
                    </td>
                    <td style={{ ...thTdStyle, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setPrintTarget(row)}
                        style={printRowBtnStyle}
                      >
                        성적표 인쇄
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {printRow && (
        <ScoreReportPrintModal
          result={printRow}
          studentLevel={printRow.level === "—" ? "" : printRow.level}
          onClose={() => setPrintTarget(null)}
        />
      )}
    </>
  );
}

const levelBadgeStyle = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 700,
};

const scoreHighlightStyle = {
  fontWeight: 800,
  color: "#0f172a",
};

const printRowBtnStyle = {
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
