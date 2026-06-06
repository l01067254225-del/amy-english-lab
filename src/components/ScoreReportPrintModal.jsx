import { useEffect } from "react";
import StudentLevelCompareDashboard from "./StudentLevelCompareDashboard";
import { formatDate } from "../services/resultsApi";
import { getSubjectSummaryForTestId } from "../utils/examHelpers";
import { formatTestDate } from "../utils/levels";
import { ensureArray } from "../utils/safeData";
import "../styles/scoreReportPrint.css";

export default function ScoreReportPrintModal({ result, studentLevel, onClose }) {
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

  if (!result) return null;

  const subject = getSubjectSummaryForTestId(result.testId);
  const percent =
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
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>성적표 미리보기</h2>
          <div style={{ display: "flex", gap: 8 }}>
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
                  성적 리포트
                </h1>
                <p style={reportSubtitleStyle}>Score Report</p>
              </header>

              <section style={infoGridStyle}>
                <InfoRow label="학생 이름" value={result.studentName} />
                <InfoRow label="레벨" value={studentLevel || "—"} />
                <InfoRow label="시험 제목" value={result.testTitle} />
                <InfoRow label="과목" value={subject} />
                <InfoRow label="시험 날짜" value={formatDate(result.submittedAt)} />
                <InfoRow label="점수" value={`${result.score} / ${result.total} (${percent}%)`} />
              </section>

              <section style={compareSectionStyle}>
                <h2 style={sectionHeadingStyle}>레벨 비교 분석</h2>
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

              {(ensureArray(result.details).length ?? 0) > 0 && (
                <section style={detailSectionStyle}>
                  <h2 style={sectionHeadingStyle}>문항별 결과</h2>
                  <div style={detailGridStyle}>
                    {ensureArray(result.details).map((item) => (
                      <div
                        key={item.num}
                        style={{
                          ...detailCellStyle,
                          color: item.correct ? "#047857" : "#b91c1c",
                        }}
                      >
                        <span>Q{item.num}</span>
                        <strong>{item.correct ? "O" : "X"}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <footer style={footerStyle}>
                <p style={footerNoteStyle}>
                  본 성적표는 AMY ENGLISH LAB 시험 시스템에서 자동 생성되었습니다.
                </p>
                <div style={stampRowStyle}>
                  <div style={stampBoxStyle}>
                    <span style={stampLabelStyle}>원장</span>
                    <div style={stampCircleStyle}>직인</div>
                  </div>
                  <p style={footerDateStyle}>발행일: {formatTestDate(new Date().toISOString().slice(0, 10))}</p>
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
  width: "min(860px, 100%)",
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

const previewScrollStyle = {
  overflow: "auto",
  padding: 20,
};

const sheetStyle = {
  background: "white",
  border: "2px solid #1e293b",
  borderRadius: 12,
  padding: "28px 32px",
  maxWidth: 720,
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

const detailSectionStyle = {
  marginBottom: 24,
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
  gap: 8,
};

const detailCellStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 13,
  background: "#fafafa",
};

const footerStyle = {
  borderTop: "1px solid #cbd5e1",
  paddingTop: 16,
  marginTop: 8,
};

const footerNoteStyle = {
  margin: "0 0 16px",
  fontSize: 12,
  color: "#64748b",
  textAlign: "center",
};

const stampRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
};

const stampBoxStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
};

const stampLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
};

const stampCircleStyle = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: "2px dashed #94a3b8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  color: "#94a3b8",
};

const footerDateStyle = {
  margin: 0,
  fontSize: 13,
  color: "#475569",
  fontWeight: 600,
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
