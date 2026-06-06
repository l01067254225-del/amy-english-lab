import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchResultById, formatDate } from "../services/resultsApi";
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

function AnswerCell({ answer, variant = "neutral" }) {
  const styles = {
    neutral: answerNeutralStyle,
    wrong: answerWrongStyle,
    correct: answerCorrectStyle,
    empty: answerEmptyStyle,
    missing: answerMissingStyle,
    loading: answerLoadingStyle,
  };

  if (!answer || answer.status === "loading") {
    return <span style={styles.loading}>데이터 로딩 중...</span>;
  }

  if (answer.status === "missing") {
    return <span style={styles.missing}>답안 기록 없음</span>;
  }

  if (answer.isEmptyString) {
    return (
      <span style={styles.empty} title="학생이 빈 문자열을 제출함">
        (빈 답안)
      </span>
    );
  }

  const text = answer.userAnswer ?? "";
  return <span style={styles[variant] ?? answerNeutralStyle}>{text}</span>;
}

export default function TeacherResultDetailModal({
  result: initialResult,
  studentLevel,
  onClose,
  loading: externalLoading = false,
}) {
  const [selectedAttempt, setSelectedAttempt] = useState("all");
  const [result, setResult] = useState(initialResult);
  const [fetchState, setFetchState] = useState("idle");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  const reloadResult = useCallback(async () => {
    if (!initialResult?.id) return;

    setFetchState("loading");
    try {
      const fresh = await fetchResultById(initialResult.id, { cache: "no-store" });
      if (fresh) {
        setResult(fresh);
        setFetchState("ready");
      } else {
        setFetchState("error");
      }
    } catch {
      setFetchState("error");
    }
  }, [initialResult?.id]);

  useEffect(() => {
    reloadResult();
  }, [reloadResult, retryCount]);

  const isLoading = externalLoading || fetchState === "loading";

  const detailView = useMemo(() => {
    if (!result || isLoading) {
      return { columns: [], rows: [], attemptHistory: [], isReady: false };
    }
    return buildAttemptWiseDetailView(result);
  }, [result, isLoading]);

  const { columns, rows, isReady } = detailView;

  const visibleColumns = useMemo(() => {
    if (selectedAttempt === "all") return columns;
    const attemptNumber = Number(selectedAttempt);
    return columns.filter((column) => column.attemptNumber === attemptNumber);
  }, [columns, selectedAttempt]);

  const hasMultipleAttempts = hasAttemptWiseHistory(result);

  if (!initialResult) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()} role="dialog">
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a" }}>
              학생 시험 결과 상세
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              {result?.studentName ?? initialResult.studentName} ·{" "}
              {formatLevelLabel(studentLevel)} · {result?.testTitle ?? initialResult.testTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            닫기
          </button>
        </div>

        <div style={summaryRowStyle}>
          {isLoading ? (
            <span style={summaryChipStyle}>데이터 로딩 중...</span>
          ) : (
            columns.map((column) => (
              <span key={column.attemptId ?? column.attemptNumber} style={summaryChipStyle}>
                {column.columnLabel}: {column.score ?? "?"}/{column.total ?? "?"}점
                {column.submittedAt ? ` · ${formatDate(column.submittedAt)}` : ""}
              </span>
            ))
          )}
          <span style={dataSourceChipStyle}>attempt_logs + answers join</span>
          {fetchState === "error" && (
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={retryBtnStyle}>
              DB 재조회
            </button>
          )}
        </div>

        <div style={toolbarStyle}>
          <label style={filterLabelStyle}>
            응시 회차 보기
            <select
              value={selectedAttempt}
              onChange={(event) => setSelectedAttempt(event.target.value)}
              style={selectStyle}
              disabled={isLoading}
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
          Q1~Q10 답안은 <strong>attempt_number=1</strong> attempt_logs를 우선 조회하고, 없으면 다음
          회차를 순회합니다. 응시 데이터(answers)와 채점 데이터(details)를 questionId/num 기준으로
          join합니다.
        </p>

        {isLoading ? (
          <p style={{ margin: "16px 0 0", color: "#64748b" }}>데이터 로딩 중...</p>
        ) : rows.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px", color: "#64748b" }}>답안 기록 없음</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={retryBtnStyle}>
              DB 재조회
            </button>
          </div>
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
                      key={`${row.questionId ?? "q"}-${row.num}`}
                      style={hasWrongInVisible ? wrongRowStyle : null}
                    >
                      <td style={tdStyle}>
                        <strong>Q{row.num ?? "—"}</strong>
                      </td>
                      <td style={tdStyle}>{row.prompt}</td>
                      {visibleColumns.map((column) => {
                        const answer = row.answersByAttempt[column.attemptNumber] ?? {
                          status: "missing",
                        };

                        return (
                          <td key={column.attemptNumber} style={tdStyle}>
                            <div style={answerStackStyle}>
                              <AnswerCell
                                answer={answer}
                                variant={
                                  answer.isCorrect === false
                                    ? "wrong"
                                    : answer.isCorrect === true
                                      ? "correct"
                                      : "neutral"
                                }
                              />
                              {answer.fallbackFrom && (
                                <span style={fallbackTagStyle}>
                                  {answer.fallbackFrom}회차에서 조회
                                </span>
                              )}
                              <ResultMark correct={answer.isCorrect} />
                            </div>
                          </td>
                        );
                      })}
                      <td style={tdStyle}>
                        <AnswerCell
                          answer={{ status: "found", userAnswer: row.correctAnswer, isEmptyString: false }}
                          variant="correct"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isReady && rows.length > 0 && (
          <p style={legendStyle}>
            attempt_logs에 답안이 없어 answers/details join을 시도했습니다. 여전히 비어 있다면
            「DB 재조회」를 눌러주세요.
          </p>
        )}

        {hasMultipleAttempts && selectedAttempt === "all" && isReady && (
          <p style={legendStyle}>
            각 회차 답안은 attempt_number별 독립 레코드입니다. 1차 답안이 없으면 다음 회차에서
            자동 조회됩니다.
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

const retryBtnStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const summaryRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
  alignItems: "center",
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

const fallbackTagStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  background: "#f1f5f9",
  padding: "2px 6px",
  borderRadius: 999,
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

const answerEmptyStyle = {
  ...answerNeutralStyle,
  background: "#fffbeb",
  border: "1px dashed #fcd34d",
  color: "#92400e",
  fontStyle: "italic",
};

const answerMissingStyle = {
  ...answerNeutralStyle,
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  fontSize: 13,
};

const answerLoadingStyle = {
  ...answerMissingStyle,
  color: "#1d4ed8",
  borderColor: "#bfdbfe",
  background: "#eff6ff",
};

const legendStyle = {
  margin: "14px 0 0",
  fontSize: 12,
  color: "#64748b",
};
