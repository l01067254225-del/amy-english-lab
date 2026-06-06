import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchResultDetailByStudentDate, formatDate } from "../services/resultsApi";
import { getResultDateKey } from "../utils/resultDetailLoader";
import { buildAttemptWiseDetailView } from "../utils/resultDetailView";
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
    recovering: answerRecoveringStyle,
  };

  if (!answer || answer.status === "loading") {
    return <span style={styles.loading}>데이터 로딩 중...</span>;
  }

  if (answer.status === "missing") {
    return <span style={styles.missing}>답안 기록 없음</span>;
  }

  if (answer.status === "recovering") {
    return (
      <div style={recoveryWrapStyle}>
        <span style={styles.recovering}>기록 복구 중</span>
        {answer.isEmptyString ? (
          <span style={styles.empty} title="학생이 빈 문자열을 제출함">
            (빈 답안)
          </span>
        ) : (
          <span style={styles[variant] ?? answerNeutralStyle}>{answer.userAnswer ?? ""}</span>
        )}
        {answer.recoveryFromAttempt && (
          <span style={recoveryTagStyle}>{answer.recoveryFromAttempt}회차 기록</span>
        )}
      </div>
    );
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
  const [result, setResult] = useState(initialResult);
  const [fetchState, setFetchState] = useState("idle");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  const reloadResult = useCallback(async () => {
    if (!initialResult) return;

    setFetchState("loading");
    try {
      const fresh = await fetchResultDetailByStudentDate(
        {
          studentId: initialResult.studentId ?? initialResult.student_id,
          studentName: initialResult.studentName,
          submittedAt: initialResult.submittedAt,
          resultId: initialResult.id,
        },
        { cache: "no-store" }
      );
      if (fresh) {
        setResult(fresh);
        setFetchState("ready");
      } else {
        setFetchState("error");
      }
    } catch {
      setFetchState("error");
    }
  }, [
    initialResult?.id,
    initialResult?.studentId,
    initialResult?.studentName,
    initialResult?.submittedAt,
  ]);

  useEffect(() => {
    reloadResult();
  }, [reloadResult, retryCount]);

  const isLoading = externalLoading || fetchState === "loading";

  const detailView = useMemo(() => {
    if (!result || isLoading) {
      return { column: null, rows: [], isReady: false };
    }
    return buildAttemptWiseDetailView(result);
  }, [result, isLoading]);

  const { column, rows, isReady, hasRecovery } = detailView;

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
            column && (
              <span style={summaryChipStyle}>
                {column.columnLabel}: {column.score ?? "?"}/{column.total ?? "?"}점
                {column.submittedAt ? ` · ${formatDate(column.submittedAt)}` : ""}
              </span>
            )
          )}
          <span style={dataSourceChipStyle}>
            {column?.lookupKey ??
              `${initialResult.studentId ?? initialResult.studentName}@${getResultDateKey(initialResult.submittedAt)}`}
          </span>
          {fetchState === "error" && (
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              style={retryBtnStyle}
            >
              DB 재조회
            </button>
          )}
        </div>

        <p style={historyHintStyle}>
          <strong>student_id + date</strong> 복합 키로 attempt_logs를 조회합니다. 1차 시험(
          <code>attempt_number = 1</code>) 데이터가 없으면 가장 최근 응시 기록으로 복구합니다.
          답안이 비어 있으면 브라우저 콘솔(F12)에 attempt_logs 전체가 출력됩니다.
        </p>

        {isLoading ? (
          <p style={{ margin: "16px 0 0", color: "#64748b" }}>데이터 로딩 중...</p>
        ) : rows.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px", color: "#64748b" }}>답안 기록 없음</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              style={retryBtnStyle}
            >
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
                  <th style={thStyle}>{column?.columnLabel ?? "1차 시험 답안"}</th>
                  <th style={thStyle}>정답</th>
                  <th style={{ ...thStyle, textAlign: "center", width: 80 }}>정오답</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const answer = row.firstExamAnswer ?? { status: "missing" };
                  const isWrong = answer.isCorrect === false;

                  return (
                    <tr key={`${row.questionId ?? "q"}-${row.num}`} style={isWrong ? wrongRowStyle : null}>
                      <td style={tdStyle}>
                        <strong>Q{row.num ?? "—"}</strong>
                      </td>
                      <td style={tdStyle}>{row.prompt}</td>
                      <td style={tdStyle}>
                        <AnswerCell
                          answer={answer}
                          variant={
                            answer.status === "recovering"
                              ? "neutral"
                              : answer.isCorrect === false
                                ? "wrong"
                                : answer.isCorrect === true
                                  ? "correct"
                                  : "neutral"
                          }
                        />
                      </td>
                      <td style={tdStyle}>
                        <AnswerCell
                          answer={{
                            status: "found",
                            userAnswer: row.correctAnswer,
                            isEmptyString: false,
                          }}
                          variant="correct"
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <ResultMark correct={answer.isCorrect} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && hasRecovery && (
          <p style={recoveryHintStyle}>
            일부 문항은 1차 시험 로그가 없어 최근 응시 기록에서 복구했습니다.
          </p>
        )}

        {!isLoading && !isReady && rows.length > 0 && (
          <p style={legendStyle}>
            attempt_number=1 로그가 없습니다. 「DB 재조회」를 눌러 다시 불러와 주세요.
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
  width: "min(960px, 100%)",
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

const answerRecoveringStyle = {
  ...answerNeutralStyle,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#c2410c",
  fontWeight: 700,
  fontSize: 12,
};

const recoveryWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const recoveryTagStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
};

const recoveryHintStyle = {
  margin: "0 0 12px",
  padding: "8px 12px",
  borderRadius: 8,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#c2410c",
  fontSize: 13,
};

const legendStyle = {
  margin: "14px 0 0",
  fontSize: 12,
  color: "#64748b",
};
