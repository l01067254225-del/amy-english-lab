import { shouldShowReadingPassage } from "../utils/examTakeView";
import { formatQuestionAnswer, getSubjectLabel } from "../utils/questionBankStorage";
import { ensureArray } from "../utils/safeData";
import "../styles/incorrectAnswerPrint.css";

function formatClinicUserAnswer(question, userAnswer) {
  const raw = String(userAnswer ?? "").trim();
  if (!raw) return "(미입력)";

  if (question.type === "objective") {
    const optionIndex = Number(raw) - 1;
    const optionText = ensureArray(question.options)[optionIndex];
    if (optionText) return `${raw}번 · ${optionText}`;
  }

  return raw;
}

export function triggerIncorrectNotePrint() {
  document.body.classList.add("incorrect-note-printing");
  window.print();
  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("incorrect-note-printing");
    },
    { once: true }
  );
}

export default function IncorrectAnswerPrintSheet({
  studentName,
  testTitle,
  items,
  clinicRetestSummary = null,
}) {
  const safeItems = ensureArray(items);
  const hasClinicRetest = Boolean(clinicRetestSummary);

  if (safeItems.length === 0) {
    return null;
  }

  const questions = safeItems.map((item) => item.question);
  const retestFixedCount = safeItems.filter((item) => item.clinicRetest?.correct).length;

  return (
    <div id="incorrect-note-print-root" aria-hidden="true" style={hiddenHostStyle}>
      <article className="incorrect-note-sheet" style={sheetStyle}>
        <header style={headerStyle}>
          <p style={brandStyle}>AMY ENGLISH LAB</p>
          <h1 style={titleStyle}>
            오답 클리닉 리포트 · {studentName || "학생"}
          </h1>
          {testTitle && <p style={subtitleStyle}>{testTitle}</p>}
          <p style={metaStyle}>
            총 {safeItems.length}문항
            {hasClinicRetest
              ? ` · 온라인 재응시 ${clinicRetestSummary.attemptCount}/${clinicRetestSummary.maxAttempts}회 · ${clinicRetestSummary.correctCount}/${clinicRetestSummary.totalCount} 정답 (${retestFixedCount}문항 복습 완료)`
              : " · 연필로 다시 풀어 보세요"}
          </p>
        </header>

        {safeItems.map((item, index) => {
          const { question, num } = item;
          const showPassage = shouldShowReadingPassage(question, questions, index);
          const isObjective = question.type === "objective";
          const options = ensureArray(question.options);

          return (
            <section key={`${question.id}-${num}`} className="incorrect-note-item" style={itemStyle}>
              {question.subject && (
                <span style={subjectTagStyle}>{getSubjectLabel(question.subject)}</span>
              )}

              {showPassage && question.passage?.trim() && (
                <div style={passageBoxStyle}>
                  <p style={passageLabelStyle}>[ 지문 ]</p>
                  <p style={passageTextStyle}>{question.passage}</p>
                </div>
              )}

              <h2 style={promptStyle}>
                {num}. {question.prompt}
              </h2>

              {isObjective && options.length > 0 ? (
                <ol style={optionsListStyle}>
                  {options.map((option, optionIndex) => (
                    <li key={`${question.id}-opt-${optionIndex}`} style={optionItemStyle}>
                      <span style={optionNumberStyle}>{optionIndex + 1}.</span>
                      <span>{option}</span>
                    </li>
                  ))}
                </ol>
              ) : question.type === "mcq" && ensureArray(question.choices).length > 0 ? (
                <ol style={optionsListStyle}>
                  {question.choices.map((choice, optionIndex) => (
                    <li key={`${question.id}-mcq-${optionIndex}`} style={optionItemStyle}>
                      <span style={optionNumberStyle}>{optionIndex + 1}.</span>
                      <span>{choice}</span>
                    </li>
                  ))}
                </ol>
              ) : question.type === "fill" && ensureArray(question.wordBank).length > 0 ? (
                <div style={wordBankStyle}>
                  <p style={passageLabelStyle}>[ 보기 ]</p>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    {question.wordBank.join(" · ")}
                  </p>
                </div>
              ) : null}

              <div style={answerAreaStyle}>
                {item.clinicRetest ? (
                  <>
                    <p style={retestResultLabelStyle}>
                      온라인 재응시 결과:{" "}
                      <strong
                        style={{
                          color: item.clinicRetest.correct ? "#047857" : "#b91c1c",
                        }}
                      >
                        {item.clinicRetest.correct ? "정답 (O)" : "오답 (X)"}
                      </strong>
                    </p>
                    <p style={retestAnswerStyle}>
                      학생 답안: {formatClinicUserAnswer(question, item.clinicRetest.userAnswer)}
                    </p>
                    <p style={retestAnswerStyle}>
                      정답: {formatQuestionAnswer(question)}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={answerLabelStyle}>답안 작성란</p>
                    <div style={linedAreaStyle}>
                      {Array.from({ length: isObjective ? 2 : 4 }).map((_, lineIndex) => (
                        <div key={lineIndex} style={noteLineStyle} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}

        <footer style={footerStyle}>
          <p style={footerTextStyle}>AMY ENGLISH LAB · Incorrect Answer Clinic</p>
        </footer>
      </article>
    </div>
  );
}

const hiddenHostStyle = {
  position: "fixed",
  left: "-9999px",
  top: 0,
  width: "210mm",
  pointerEvents: "none",
};

const sheetStyle = {
  background: "white",
  color: "#0f172a",
  fontFamily: "'Malgun Gothic', 'Segoe UI', Arial, sans-serif",
  lineHeight: 1.65,
};

const headerStyle = {
  textAlign: "center",
  borderBottom: "2px solid #0f172a",
  paddingBottom: 14,
  marginBottom: 22,
};

const brandStyle = {
  margin: "0 0 6px",
  fontSize: 12,
  letterSpacing: "0.2em",
  fontWeight: 800,
  color: "#2563eb",
};

const titleStyle = {
  margin: "0 0 6px",
  fontSize: 22,
  fontWeight: 800,
};

const subtitleStyle = {
  margin: "0 0 4px",
  fontSize: 14,
  color: "#475569",
  fontWeight: 600,
};

const metaStyle = {
  margin: 0,
  fontSize: 12,
  color: "#64748b",
};

const itemStyle = {
  marginBottom: 28,
  paddingBottom: 22,
  borderBottom: "1px solid #e2e8f0",
};

const subjectTagStyle = {
  display: "inline-block",
  marginBottom: 10,
  padding: "3px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
};

const passageBoxStyle = {
  marginBottom: 14,
  padding: "14px 16px",
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 4,
};

const passageLabelStyle = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 800,
  color: "#334155",
};

const passageTextStyle = {
  margin: 0,
  fontSize: 13,
  whiteSpace: "pre-wrap",
  lineHeight: 1.8,
};

const wordBankStyle = {
  marginBottom: 14,
  padding: "10px 14px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 4,
};

const promptStyle = {
  margin: "0 0 12px",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.7,
};

const optionsListStyle = {
  margin: "0 0 14px",
  paddingLeft: 22,
  listStyle: "none",
};

const optionItemStyle = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
  fontSize: 14,
  lineHeight: 1.6,
};

const optionNumberStyle = {
  minWidth: 18,
  fontWeight: 800,
  color: "#334155",
};

const answerAreaStyle = {
  marginTop: 6,
};

const answerLabelStyle = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
};

const retestResultLabelStyle = {
  margin: "0 0 8px",
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
};

const retestAnswerStyle = {
  margin: "0 0 6px",
  fontSize: 13,
  color: "#475569",
  lineHeight: 1.6,
};

const linedAreaStyle = {
  minHeight: 72,
  padding: "8px 0",
};

const noteLineStyle = {
  height: 28,
  borderBottom: "1px solid #cbd5e1",
  marginBottom: 4,
};

const footerStyle = {
  marginTop: 24,
  paddingTop: 12,
  borderTop: "1px solid #e2e8f0",
  textAlign: "center",
};

const footerTextStyle = {
  margin: 0,
  fontSize: 11,
  color: "#94a3b8",
  letterSpacing: "0.06em",
};
