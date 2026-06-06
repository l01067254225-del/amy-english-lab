import { formatDate } from "../services/resultsApi";
import { buildResultDetailRows, hasMultiAttemptHistory } from "../utils/resultDetailView";
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

  return <span style={styles[variant] ?? answerNeutralStyle}>{text}</span>;
}

export default function TeacherResultDetailModal({ result, studentLevel, onClose }) {
  if (!result) return null;

  const rows = buildResultDetailRows(result);
  const showAttemptHistory = hasMultiAttemptHistory(result);
  const percent =
    result.total > 0 ? Math.round((Number(result.score) / Number(result.total)) * 100) : 0;
  const hasWrongRows = rows.some((row) => !row.correct);

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
          <span style={summaryChipStyle}>{formatDate(result.submittedAt)}</span>
          <span style={summaryChipStyle}>
            {result.score}/{result.total}점 ({percent}%)
          </span>
          {result.attemptCount > 1 && (
            <span style={summaryChipStyle}>{result.attemptCount}회차</span>
          )}
        </div>

        {showAttemptHistory && (
          <p style={historyHintStyle}>
            재시험·오답 노트 이력이 있는 문항은 1차 답안과 이후 답안을 구분해 표시합니다.
          </p>
        )}

        <h3 style={sectionTitleStyle}>문제별 상세 답안</h3>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>문제 번호</th>
                <th style={thStyle}>문제 내용</th>
                <th style={thStyle}>학생 답안</th>
                <th style={thStyle}>정답</th>
                <th style={{ ...thStyle, textAlign: "center", width: 96 }}>정오답</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.questionId ?? "q"}-${row.num}`}
                  style={row.correct ? null : wrongRowStyle}
                >
                  <td style={tdStyle}>
                    <strong>Q{row.num}</strong>
                    {row.examRetestPassed && (
                      <span style={retestPassedTagStyle}>재시험 통과</span>
                    )}
                  </td>
                  <td style={tdStyle}>{row.prompt}</td>
                  <td style={tdStyle}>
                    {row.attempts.length > 1 ? (
                      <div style={attemptStackStyle}>
                        {row.attempts.map((attempt) => (
                          <div key={attempt.label} style={attemptLineStyle}>
                            <span style={attemptLabelStyle}>{attempt.label}</span>
                            <AnswerCell
                              text={attempt.userAnswer}
                              variant={
                                attempt.correct === false
                                  ? "wrong"
                                  : attempt.correct === true
                                    ? "correct"
                                    : "neutral"
                              }
                            />
                            {attempt.correct != null && (
                              <ResultMark correct={attempt.correct} />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={compareRowStyle}>
                        <AnswerCell
                          text={row.latestStudentAnswer}
                          variant={row.correct ? "correct" : "wrong"}
                        />
                        {!row.correct && (
                          <span style={compareArrowStyle}>↔</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={compareRowStyle}>
                      {!row.correct && row.attempts.length <= 1 && (
                        <span style={compareArrowStyle}>↔</span>
                      )}
                      <AnswerCell text={row.correctAnswer} variant="correct" />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <ResultMark correct={row.correct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <p style={{ margin: "16px 0 0", color: "#64748b" }}>문항별 상세 데이터가 없습니다.</p>
        )}

        {hasWrongRows && (
          <p style={legendStyle}>
            오답 문항은 학생 답안(빨간색)과 정답(초록색)을 나란히 비교할 수 있습니다.
          </p>
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

const historyHintStyle = {
  margin: "0 0 12px",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  fontSize: 13,
  lineHeight: 1.6,
};

const sectionTitleStyle = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 800,
  color: "#0f172a",
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

const compareRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const compareArrowStyle = {
  color: "#94a3b8",
  fontWeight: 800,
  fontSize: 16,
};

const attemptStackStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const attemptLineStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const attemptLabelStyle = {
  minWidth: 72,
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
};

const retestPassedTagStyle = {
  display: "block",
  marginTop: 4,
  fontSize: 11,
  fontWeight: 700,
  color: "#047857",
};

const legendStyle = {
  margin: "14px 0 0",
  fontSize: 12,
  color: "#64748b",
};
