import { useEffect, useMemo, useState } from "react";
import StudentLevelCompareDashboard from "./StudentLevelCompareDashboard";
import { formatDate } from "../services/resultsApi";
import { formatTestDate } from "../utils/levels";
import {
  SUBJECT_KEYS,
  SUBJECT_SMS_LABELS,
  aggregateSubjectAverages,
  buildScoreHistoryTimeline,
  formatSubjectScoreValue,
  getPeriodRangeLabel,
  getStudentResultsInPeriod,
} from "../utils/scoreAnalytics";
import { ensureArray } from "../utils/safeData";
import "../styles/scoreReportPrint.css";

const PERIOD_OPTIONS = [
  { days: 7, label: "최근 7일" },
  { days: 30, label: "최근 30일" },
  { days: 90, label: "최근 90일" },
];

export default function ScoreReportPrintModal({
  result,
  allResults = [],
  studentLevel,
  onClose,
}) {
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    document.body.classList.add("score-report-printing");
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("score-report-printing");
      },
      { once: true }
    );
  };

  const periodResults = useMemo(() => {
    if (!result) return [];
    return getStudentResultsInPeriod(
      allResults,
      result.studentId,
      result.studentName,
      periodDays
    );
  }, [allResults, result, periodDays]);

  const subjectAverages = useMemo(
    () => aggregateSubjectAverages(periodResults),
    [periodResults]
  );

  const scoreTimeline = useMemo(
    () => buildScoreHistoryTimeline(periodResults),
    [periodResults]
  );

  const periodRangeLabel = useMemo(
    () => getPeriodRangeLabel(periodDays),
    [periodDays]
  );

  if (!result) return null;

  const latestPercent =
    result.total > 0 ? Math.round((Number(result.score) / Number(result.total)) * 100) : 0;

  return (
    <div className="score-report-no-print" style={overlayStyle} onClick={onClose}>
      <div
        style={modalShellStyle}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-report-title"
      >
        <div className="score-report-no-print" style={modalToolbarStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>월간 성적표 미리보기</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {result.studentName} · 누적 통계 리포트
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              style={periodSelectStyle}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={handlePrint} style={printBtnStyle}>
              인쇄하기
            </button>
            <button type="button" onClick={onClose} style={closeBtnStyle}>
              닫기
            </button>
          </div>
        </div>

        <div style={previewScrollStyle}>
          <div id="score-report-print-root">
            <article className="score-report-sheet" style={sheetStyle}>
              <header style={reportHeaderStyle}>
                <p style={reportBrandStyle}>AMY ENGLISH LAB</p>
                <h1 id="score-report-title" style={reportTitleStyle}>
                  월간 성적 리포트
                </h1>
                <p style={reportSubtitleStyle}>Monthly Score Report</p>
              </header>

              <section style={infoGridStyle}>
                <InfoRow label="학생 이름" value={result.studentName} />
                <InfoRow label="레벨" value={studentLevel || "—"} />
                <InfoRow label="조회 기간" value={periodRangeLabel} />
                <InfoRow label="응시 횟수" value={`${periodResults.length}회`} />
                <InfoRow label="기준 시험" value={result.testTitle} />
                <InfoRow
                  label="최근 응시"
                  value={`${formatDate(result.submittedAt)} · ${result.score}/${result.total} (${latestPercent}%)`}
                />
              </section>

              <section style={compareSectionStyle}>
                <h2 style={sectionHeadingStyle}>영역별 평균 (100점 만점)</h2>
                <div style={subjectAvgGridStyle}>
                  {SUBJECT_KEYS.map((subject) => (
                    <div key={subject} style={subjectAvgCardStyle}>
                      <span style={subjectAvgLabelStyle}>{SUBJECT_SMS_LABELS[subject]}</span>
                      <strong style={subjectAvgValueStyle}>
                        {formatSubjectScoreValue(subjectAverages[subject])}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>

              <section style={compareSectionStyle}>
                <h2 style={sectionHeadingStyle}>날짜별 성적 추이</h2>
                {scoreTimeline.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                    선택한 기간에 응시 기록이 없습니다.
                  </p>
                ) : (
                  <div style={timelineTableWrapStyle} className="score-report-timeline-table">
                    <table style={timelineTableStyle}>
                      <thead>
                        <tr>
                          <th style={timelineThStyle}>날짜</th>
                          <th style={timelineThStyle}>시험 제목</th>
                          <th style={timelineThStyle}>점수</th>
                          <th style={timelineThStyle}>영역별 (100점)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoreTimeline.map((entry) => (
                          <tr key={entry.id}>
                            <td style={timelineTdStyle}>{entry.dateLabel}</td>
                            <td style={timelineTdStyle}>{entry.testTitle}</td>
                            <td style={timelineTdStyle}>
                              {entry.score}/{entry.total} ({entry.percent}%)
                            </td>
                            <td style={timelineTdStyle}>
                              {entry.subjectSummary || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section style={compareSectionStyle}>
                <h2 style={sectionHeadingStyle}>선택 시험 · 레벨 비교</h2>
                <div className="score-report-compare-grid">
                  <StudentLevelCompareDashboard
                    studentId={result.studentId}
                    result={result}
                    level={studentLevel}
                    myScoreTitle="학생 성적"
                    className="score-report-compare"
                  />
                </div>
              </section>

              <footer style={footerStyle}>
                <div style={footerRowStyle} className="score-report-footer-row">
                  <div style={signatureBlockStyle}>
                    <span style={signatureLabelStyle}>담당</span>
                    <span className="score-report-signature" style={signatureNameStyle}>
                      Amy Lee
                    </span>
                  </div>
                  <p style={footerDateStyle}>
                    발행일: {formatTestDate(new Date().toISOString().slice(0, 10))}
                  </p>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
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
  zIndex: 1000,
};

const modalShellStyle = {
  width: "min(920px, 100%)",
  maxHeight: "92vh",
  background: "#f8fafc",
  borderRadius: 16,
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalToolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "16px 20px",
  borderBottom: "1px solid #e2e8f0",
  background: "white",
  flexWrap: "wrap",
};

const periodSelectStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  fontWeight: 700,
  fontSize: 14,
  color: "#334155",
};

const previewScrollStyle = {
  overflow: "auto",
  padding: 20,
};

const sheetStyle = {
  background: "white",
  border: "2px solid #1e293b",
  borderRadius: 12,
  padding: "28px 32px",
  maxWidth: 760,
  margin: "0 auto",
  fontFamily: "'Segoe UI', Georgia, serif",
};

const reportHeaderStyle = {
  textAlign: "center",
  borderBottom: "2px solid #0f172a",
  paddingBottom: 16,
  marginBottom: 20,
};

const reportBrandStyle = {
  margin: "0 0 6px",
  fontSize: 13,
  letterSpacing: "0.18em",
  fontWeight: 800,
  color: "#2563eb",
};

const reportTitleStyle = {
  margin: "0 0 4px",
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

const reportSubtitleStyle = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
  letterSpacing: "0.08em",
};

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px 24px",
  marginBottom: 24,
  padding: "16px 18px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
};

const infoRowStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const infoLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
};

const infoValueStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
};

const compareSectionStyle = {
  marginBottom: 24,
};

const sectionHeadingStyle = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 800,
  color: "#0f172a",
  borderLeft: "4px solid #2563eb",
  paddingLeft: 10,
};

const subjectAvgGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const subjectAvgCardStyle = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const subjectAvgLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
};

const subjectAvgValueStyle = {
  fontSize: 22,
  fontWeight: 800,
  color: "#2563eb",
};

const timelineTableWrapStyle = {
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
};

const timelineTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const timelineThStyle = {
  padding: "10px 12px",
  textAlign: "left",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#64748b",
  fontWeight: 700,
};

const timelineTdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  verticalAlign: "top",
};

const footerStyle = {
  borderTop: "1px solid #cbd5e1",
  paddingTop: 20,
  paddingBottom: 4,
  marginTop: 12,
};

const footerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 24,
  minHeight: 72,
};

const signatureBlockStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 2,
};

const signatureLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.06em",
};

const signatureNameStyle = {
  fontFamily: "'Great Vibes', 'Alex Brush', cursive",
  fontSize: "2.1rem",
  fontWeight: 400,
  color: "#0f172a",
  lineHeight: 1.1,
  marginTop: 2,
  paddingBottom: 2,
  transform: "rotate(-2deg)",
  transformOrigin: "left bottom",
};

const footerDateStyle = {
  margin: 0,
  fontSize: 13,
  color: "#475569",
  fontWeight: 600,
  whiteSpace: "nowrap",
  paddingBottom: 6,
};

const printBtnStyle = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const closeBtnStyle = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
};
