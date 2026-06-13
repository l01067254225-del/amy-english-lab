import { useEffect, useMemo, useState } from "react";
import IncorrectAnswerNoteModal from "../../components/IncorrectAnswerNoteModal";
import ScoreReportPrintModal from "../../components/ScoreReportPrintModal";
import TeacherResultDetailModal from "../../components/TeacherResultDetailModal";
import { fetchResultDetailByStudentDate } from "../../services/resultsApi";
import { countIncorrectAnswers } from "../../utils/incorrectAnswerClinic";
import {
  buildDailySmsText,
  copyTextToClipboard,
  getResultDateKey,
  getStudentResultsOnDate,
  mergeDailySubjectScores,
} from "../../utils/scoreAnalytics";
import { formatDate } from "../../services/resultsApi";
import { getSubjectSummaryForTestId } from "../../utils/examHelpers";
import { LEVEL_OPTIONS, formatLevelLabel } from "../../utils/levels";
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
  const [incorrectTarget, setIncorrectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

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

  const detailRow = detailTarget
    ? registryRows.find((row) => row.id === detailTarget.id) ?? detailTarget
    : null;

  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!detailTarget?.id) {
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    (async () => {
      try {
        const fresh = await fetchResultDetailByStudentDate(
          {
            studentId: detailTarget.studentId,
            studentName: detailTarget.studentName,
            submittedAt: detailTarget.submittedAt,
            resultId: detailTarget.id,
          },
          { cache: "no-store" }
        );
        if (cancelled) return;
        if (fresh) setDetailTarget(fresh);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailTarget?.id]);

  const handleCopyDailySms = async (row) => {
    const dateKey = getResultDateKey(row.submittedAt);
    const dayResults = getStudentResultsOnDate(
      safeResults,
      row.studentId,
      row.studentName,
      dateKey
    );
    const subjectScores = mergeDailySubjectScores(dayResults);
    const message = buildDailySmsText({
      studentName: row.studentName,
      level: row.level === "—" ? "" : row.level,
      dateKey,
      subjectScores,
    });

    try {
      await copyTextToClipboard(message);
      alert("문자 내용이 복사되었습니다. 붙여넣기(Ctrl+V)하여 전송하세요!");
    } catch (error) {
      console.error(error);
      alert("클립보드 복사에 실패했습니다.");
    }
  };

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
          행을 클릭하거나 [상세 보기]로 문항별 답안을 확인할 수 있습니다. 당일 결과는 [문자
          복사]로 전송하고, [성적표 인쇄]로 최근 1달 누적 통계를 확인할 수 있습니다.
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
                  <th style={{ ...thTdStyle, textAlign: "right", minWidth: 380 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetailTarget(row)}
                    style={clickableRowStyle}
                    title="클릭하여 상세 답안 보기"
                  >
                    <td style={thTdStyle}>{formatDate(row.submittedAt)}</td>
                    <td style={thTdStyle}>
                      <strong>{row.studentName}</strong>
                    </td>
                    <td style={thTdStyle}>
                      <span style={levelBadgeStyle}>{formatLevelLabel(row.level)}</span>
                    </td>
                    <td style={thTdStyle}>{row.testTitle}</td>
                    <td style={thTdStyle}>{row.subject}</td>
                    <td style={thTdStyle}>
                      <span style={scoreHighlightStyle}>
                        {row.score} / {row.total}
                      </span>
                    </td>
                    <td style={{ ...thTdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailTarget(row);
                          }}
                          style={detailRowBtnStyle}
                        >
                          상세 보기
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCopyDailySms(row);
                          }}
                          style={smsRowBtnStyle}
                        >
                          문자 복사
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPrintTarget(row);
                          }}
                          style={printRowBtnStyle}
                        >
                          성적표 인쇄
                        </button>
                        {countIncorrectAnswers(row) > 0 && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setIncorrectTarget(row);
                            }}
                            style={incorrectRowBtnStyle}
                          >
                            오답 노트
                          </button>
                        )}
                      </div>
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
          allResults={safeResults}
          studentLevel={printRow.level === "—" ? "" : printRow.level}
          onClose={() => setPrintTarget(null)}
        />
      )}

      {incorrectTarget && (
        <IncorrectAnswerNoteModal
          result={incorrectTarget}
          studentName={incorrectTarget.studentName}
          onClose={() => setIncorrectTarget(null)}
        />
      )}

      {detailRow && (
        <TeacherResultDetailModal
          result={detailRow}
          studentLevel={detailRow.level === "—" ? "" : detailRow.level}
          loading={detailLoading}
          onClose={() => setDetailTarget(null)}
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

const smsRowBtnStyle = {
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid #bbf7d0",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
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

const incorrectRowBtnStyle = {
  ...printRowBtnStyle,
  borderColor: "#cbd5e1",
  background: "white",
  color: "#334155",
};

const detailRowBtnStyle = {
  ...printRowBtnStyle,
  borderColor: "#ddd6fe",
  background: "#f5f3ff",
  color: "#6d28d9",
};

const clickableRowStyle = {
  cursor: "pointer",
};
