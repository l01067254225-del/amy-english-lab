import { useMemo, useState } from "react";
import { formatDate } from "../services/resultsApi";
import {
  buildAttemptWiseDetailView,
  hasAttemptWiseHistory,
} from "../utils/resultDetailView";
import { formatLevelLabel } from "../utils/levels";

function ResultMark({ correct }) {
  if (correct == null) return null;

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

  return <span style={styles[variant] ?? answerNeutralStyle}>{text === "" ? "—" : text}</span>;
}

export default function TeacherResultDetailModal({ result, studentLevel, onClose }) {
  const [selectedAttempt, setSelectedAttempt] = useState("all");

  const { columns, rows } = useMemo(
    () => buildAttemptWiseDetailView(result),
    [result]
  );

  const visibleColumns = useMemo(() => {
    if (selectedAttempt === "all") return columns;
    const attemptNumber = Number(selectedAttempt);
    return columns.filter((column) => column.attemptNumber === attemptNumber);
  }, [columns, selectedAttempt]);

  const hasMultipleAttempts = hasAttemptWiseHistory(result);

  if (!result) return null;

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
          {columns.map((column) => (
            <span key={column.attemptId ?? column.attemptNumber} style={summaryChipStyle}>
              {column.columnLabel}: {column.score ?? "—"}/{column.total ?? "—"}점
              {column.submittedAt ? ` · ${formatDate(column.submittedAt)}` : ""}
            </span>
          ))}
          <span style={dataSourceChipStyle}>데이터 출처: attempt_history</span>
        </div>

        <div style={toolbarStyle}>
          <label style={filterLabelStyle}>
            응시 회차 보기
            <select
              value={selectedAttempt}
              onChange={(event) => setSelectedAttempt(event.target.value)}
              style={selectStyle}
            >
              <option value="all">전체 회차 (나란히 비교)</option>
              {columns.map((column) => (
                <option key={column.attemptNumber} value={String(column.attemptNumber)}>
                  {column.columnLabel}만 보기
                </option>
              ))}
            </select>
          </label>
        </div>

        <p style={historyHintStyle}>
          학생 답안은 <strong>attempt_history</strong>에서 <code>attempt_number</code>별로
          독립 조회합니다. 1차 시험의 부분 답안(예: 슬래시 앞 단어만 입력)도 DB 로그와 1:1로
          표시되며, 재시험 데이터가 1차 데이터를 덮어쓰지 않습니다.
        </p>

        {columns.length === 0 ? (
          <p style={{ margin: "16px 0 0", color: "#64748b" }}>
            attempt_history 기록이 없어 상세 답안을 표시할 수 없습니다.
          </p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>문제 번호</th>
                  <th style={thStyle}>문제 내용</th>
                  {visibleColumns.map((column) => (
                    <th key={column.attemptNumber} style={thStyle}>
                      {column.columnLabel}
                    </th>
                  ))}
                  <th style={thStyle}>정답</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const hasWrongInVisible = visibleColumns.some(
                    (column) => row.answersByAttempt[column.attemptNumber]?.isCorrect === false
                  );

                  return (
                    <tr
                      key={row.questionId ?? row.num}
                      style={hasWrongInVisible ? wrongRowStyle : null}
                    >
                      <td style={tdStyle}>
                        <strong>Q{row.num ?? "—"}</strong>
                      </td>
                      <td style={tdStyle}>{row.prompt}</td>
                      {visibleColumns.map((column) => {
                        const answer = row.answersByAttempt[column.attemptNumber];
                        return (
                          <td key={column.attemptNumber} style={tdStyle}>
                            {answer ? (
                              <div style={answerStackStyle}>
                                <AnswerCell
                                  text={answer.userAnswer}
                                  variant={
                                    answer.isCorrect === false
                                      ? "wrong"
                                      : answer.isCorrect === true
                                        ? "correct"
                                        : "neutral"
                                  }
                                />
                                <ResultMark correct={answer.isCorrect} />
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={tdStyle}>
                        <AnswerCell text={row.correctAnswer} variant="correct" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasMultipleAttempts && selectedAttempt === "all" && (
          <p style={legendStyle}>
            각 회차 답안은 attempt_number별 독립 레코드입니다. 열을 좌우로 비교해 1차와 재시
            답안 차이를 확인하세요.
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
  width: "min(1180px, 100%)",
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

const toolbarStyle = {
  marginBottom: 12,
};

const filterLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
};

const selectStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  fontSize: 14,
  fontWeight: 600,
  color: "#0f172a",
  minWidth: 240,
};

const historyHintStyle = {
  margin: "0 0 16px",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.6,
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
  width: 24,
  height: 24,
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  flexShrink: 0,
};

const answerStackStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  flexWrap: "wrap",
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

const legendStyle = {
  margin: "14px 0 0",
  fontSize: 12,
  color: "#64748b",
};
