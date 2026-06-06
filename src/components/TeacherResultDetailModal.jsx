import { formatDate } from "../services/resultsApi";
import {
  buildSessionBasedDetailView,
  hasSessionBasedHistory,
} from "../utils/resultDetailView";
import { formatLevelLabel } from "../utils/levels";

function ResultMark({ correct }) {
  return (
    <span
      style={{
        ...markStyle,
        color: correct ? "#047857" : "#dc2626",
        background: correct ? "#ecfdf5" : "#fef2f2",
        border: `1px solid ${correct ? "#6ee7b7" : "#fecaca"}`,
      }}
    >
      {correct ? "O" : "X"}
    </span>
  );
}

function AnswerCell({ text, variant = "neutral" }) {
  const styles = {
    neutral: answerNeutralStyle,
    wrong: answerWrongStyle,
    correct: answerCorrectStyle,
  };

  return <span style={styles[variant] ?? answerNeutralStyle}>{text || "—"}</span>;
}

export default function TeacherResultDetailModal({ result, studentLevel, onClose }) {
  if (!result) return null;

  const { sessions, summary } = buildSessionBasedDetailView(result);
  const hasMultipleSessions = hasSessionBasedHistory(result);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()} role="dialog">
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a" }}>
              학생 시험 결과 상세
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              {result.studentName} · {formatLevelLabel(studentLevel)} · {result.testTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            닫기
          </button>
        </div>

        <div style={summaryRowStyle}>
          <span style={summaryChipStyle}>
            최종 제출: {formatDate(summary?.submittedAt ?? result.submittedAt)}
          </span>
          <span style={summaryChipStyle}>
            최종 점수 {summary?.score ?? result.score}/{summary?.total ?? result.total}점 (
            {summary?.percent ?? 0}%)
          </span>
          {(summary?.attemptCount ?? 1) > 1 && (
            <span style={summaryChipStyle}>{summary.attemptCount}회 응시</span>
          )}
          <span style={dataSourceChipStyle}>데이터 출처: attempt_logs</span>
        </div>

        <p style={historyHintStyle}>
          각 응시 단계의 답안은 results 테이블이 아닌 <strong>attempt_logs</strong> 스냅샷에서
          그대로 불러옵니다. 1차 시험에서 부분만 작성한 답안도 덮어쓰기 없이 표시됩니다.
        </p>

        {sessions.length === 0 ? (
          <p style={{ margin: "16px 0 0", color: "#64748b" }}>
            응시 로그(attempt_logs)가 없어 상세 답안을 표시할 수 없습니다.
          </p>
        ) : (
          sessions.map((session, sessionIndex) => (
            <section key={session.attemptId ?? session.label} style={sessionSectionStyle}>
              <div style={sessionHeaderStyle}>
                <div>
                  <h3 style={sessionTitleStyle}>
                    {session.label}
                    {hasMultipleSessions && (
                      <span style={sessionIndexStyle}> · {sessionIndex + 1}번째 기록</span>
                    )}
                  </h3>
                  <p style={sessionMetaStyle}>
                    {formatDate(session.submittedAt)} · {session.score}/{session.total}점 ·
                    attempt_id: {session.attemptId ?? "—"}
                  </p>
                </div>
              </div>

              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>문제 번호</th>
                      <th style={thStyle}>문제 내용</th>
                      <th style={thStyle}>제출 답안 (로그 원본)</th>
                      <th style={thStyle}>정답</th>
                      <th style={{ ...thStyle, textAlign: "center", width: 96 }}>정오답</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.rows.map((row) => (
                      <tr
                        key={`${session.attemptId}-${row.questionId ?? row.num}`}
                        style={row.isCorrect === false ? wrongRowStyle : null}
                      >
                        <td style={tdStyle}>
                          <strong>Q{row.num ?? "—"}</strong>
                        </td>
                        <td style={tdStyle}>{row.prompt}</td>
                        <td style={tdStyle}>
                          <AnswerCell
                            text={row.userAnswer}
                            variant={
                              row.isCorrect === false
                                ? "wrong"
                                : row.isCorrect === true
                                  ? "correct"
                                  : "neutral"
                            }
                          />
                        </td>
                        <td style={tdStyle}>
                          <AnswerCell text={row.correctAnswer} variant="correct" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <ResultMark correct={row.isCorrect === true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {session.rows.length === 0 && (
                <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 13 }}>
                  이 응시 단계에 저장된 attempt_logs가 없습니다.
                </p>
              )}
            </section>
          ))
        )}
      </div>
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
  zIndex: 1050,
};

const modalStyle = {
  width: "min(1080px, 100%)",
  maxHeight: "92vh",
  overflow: "auto",
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 16,
};

const closeBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
  flexShrink: 0,
};

const summaryRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const summaryChipStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 700,
};

const dataSourceChipStyle = {
  ...summaryChipStyle,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
};

const historyHintStyle = {
  margin: "0 0 20px",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.6,
};

const sessionSectionStyle = {
  marginBottom: 28,
  paddingBottom: 24,
  borderBottom: "2px solid #e2e8f0",
};

const sessionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

const sessionTitleStyle = {
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  color: "#0f172a",
};

const sessionIndexStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#64748b",
};

const sessionMetaStyle = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "#64748b",
};

const tableWrapStyle = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "2px solid #e2e8f0",
  color: "#475569",
  fontWeight: 800,
  background: "#f8fafc",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
  lineHeight: 1.6,
  color: "#334155",
};

const wrongRowStyle = {
  background: "#fffafa",
};

const markStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 14,
};

const answerNeutralStyle = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 6,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const answerWrongStyle = {
  ...answerNeutralStyle,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontWeight: 700,
};

const answerCorrectStyle = {
  ...answerNeutralStyle,
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#047857",
  fontWeight: 700,
};
