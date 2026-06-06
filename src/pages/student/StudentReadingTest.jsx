import { useEffect, useMemo, useState } from "react";
import { getAnswerFeedback, gradeQuestion } from "../../utils/grade";
import {
  getPassageNumberLabel,
  resolvePassageForQuestion,
} from "../../utils/readingPassage";

export default function StudentReadingTest({
  passage,
  questions,
  answers,
  submitted,
  saving,
  onAnswer,
  onSubmit,
  onReset,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const userAnswer = answers[currentQuestion?.id] ?? "";
  const earned = submitted ? gradeQuestion(currentQuestion, userAnswer) : null;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const activePassage = useMemo(() => {
    const fromQuestion = resolvePassageForQuestion(currentQuestion);
    return fromQuestion || passage || "";
  }, [currentQuestion, passage]);

  const passageTitle = useMemo(
    () => getPassageNumberLabel(currentQuestion),
    [currentQuestion]
  );

  useEffect(() => {
    setCurrentIndex(0);
  }, [questions.length]);

  if (!currentQuestion) {
    return (
      <div style={emptyWrapStyle}>
        <p style={{ margin: 0, color: "#64748b" }}>Reading 문항이 없습니다.</p>
      </div>
    );
  }

  return (
    <div style={splitLayoutStyle}>
      <aside style={passagePanelStyle}>
        <div style={passageHeaderStyle}>
          <span style={passageLabelStyle}>{passageTitle}</span>
          <span style={passageHintStyle}>지문을 읽으며 문제를 풀어 보세요</span>
        </div>
        <div style={passageScrollStyle}>
          <p style={passageTextStyle}>{activePassage}</p>
        </div>
      </aside>

      <section style={questionPanelStyle}>
        <div style={questionTopBarStyle}>
          <span style={progressBadgeStyle}>
            Question {currentIndex + 1} / {total}
          </span>
          <div style={dotRowStyle}>
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                style={{
                  ...dotStyle,
                  ...(index === currentIndex ? dotActiveStyle : {}),
                  ...(answers[question.id] ? dotAnsweredStyle : {}),
                }}
                title={`${index + 1}번`}
              />
            ))}
          </div>
        </div>

        <div style={questionCardStyle}>
          <h2 style={questionPromptStyle}>
            Q{currentIndex + 1}. {currentQuestion.prompt}
          </h2>

          {currentQuestion.type === "objective" && (
            <div style={optionsListStyle}>
              {currentQuestion.options.map((option, index) => {
                const checked = userAnswer === option;
                return (
                  <label
                    key={`${currentQuestion.id}-${index}`}
                    style={{
                      ...optionLabelStyle,
                      ...(checked ? optionLabelCheckedStyle : {}),
                      ...(submitted && earned === 0 && checked ? optionWrongStyle : {}),
                      ...(submitted && earned === 1 && checked ? optionCorrectStyle : {}),
                    }}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      checked={checked}
                      disabled={submitted}
                      onChange={() => onAnswer(currentQuestion.id, option)}
                      style={radioStyle}
                    />
                    <span style={optionNumStyle}>{index + 1}</span>
                    <span style={{ flex: 1 }}>{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "subjective" && (
            <textarea
              value={userAnswer}
              disabled={submitted}
              onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
              placeholder="정답을 입력하세요"
              rows={5}
              style={textareaStyle}
            />
          )}

          {currentQuestion.type === "fill" && (
            <>
              {currentQuestion.wordBank?.length > 0 && (
                <div style={wordBankStyle}>
                  <strong style={{ fontSize: 13, color: "#92400e" }}>단어 보기</strong>
                  <div style={wordBankRowStyle}>
                    {currentQuestion.wordBank.map((word) => (
                      <span key={word} style={wordChipStyle}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <select
                value={userAnswer}
                disabled={submitted}
                onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                style={selectStyle}
              >
                <option value="">단어 선택</option>
                {currentQuestion.wordBank?.map((word) => (
                  <option key={word} value={word}>
                    {word}
                  </option>
                ))}
              </select>
            </>
          )}

          {submitted && (
            <div
              style={{
                ...feedbackStyle,
                color: earned === 1 ? "#047857" : "#b91c1c",
                background: earned === 1 ? "#ecfdf5" : "#fef2f2",
              }}
            >
              {earned === 1 ? "정답입니다." : getAnswerFeedback(currentQuestion)}
            </div>
          )}
        </div>

        <div style={navRowStyle}>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={isFirst}
            style={{ ...navBtnStyle, opacity: isFirst ? 0.45 : 1 }}
          >
            ← 이전 문제
          </button>

          {!submitted ? (
            isLast ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                style={{
                  ...submitBtnStyle,
                  background: saving ? "#94a3b8" : "#2563eb",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "저장 중..." : "제출"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(total - 1, prev + 1))}
                style={navBtnPrimaryStyle}
              >
                다음 문제 →
              </button>
            )
          ) : (
            <>
              {!isLast && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(total - 1, prev + 1))}
                  style={navBtnPrimaryStyle}
                >
                  다음 문제 →
                </button>
              )}
              <button type="button" onClick={onReset} style={{ ...navBtnStyle, marginLeft: isLast ? "auto" : 0 }}>
                다시 풀기
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

const splitLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  minHeight: "calc(100vh - 220px)",
  alignItems: "stretch",
};

const passagePanelStyle = {
  background: "#faf5ff",
  border: "1px solid #e9d5ff",
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 520,
};

const passageHeaderStyle = {
  padding: "16px 20px",
  borderBottom: "1px solid #e9d5ff",
  background: "white",
};

const passageLabelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#7c3aed",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const passageHintStyle = {
  display: "block",
  marginTop: 4,
  fontSize: 13,
  color: "#94a3b8",
};

const passageScrollStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 28px",
};

const passageTextStyle = {
  margin: 0,
  fontSize: 17,
  lineHeight: 2,
  color: "#1e293b",
  whiteSpace: "pre-wrap",
  letterSpacing: "0.01em",
};

const questionPanelStyle = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  minHeight: 520,
};

const questionTopBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "14px 20px",
  borderBottom: "1px solid #e2e8f0",
  flexWrap: "wrap",
};

const progressBadgeStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 13,
  fontWeight: 800,
};

const dotRowStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const dotStyle = {
  width: 10,
  height: 10,
  borderRadius: 999,
  border: "none",
  background: "#e2e8f0",
  cursor: "pointer",
  padding: 0,
};

const dotActiveStyle = {
  background: "#2563eb",
  transform: "scale(1.15)",
};

const dotAnsweredStyle = {
  boxShadow: "inset 0 0 0 2px #93c5fd",
};

const questionCardStyle = {
  flex: 1,
  padding: "24px 24px 16px",
  overflowY: "auto",
};

const questionPromptStyle = {
  margin: "0 0 20px",
  fontSize: 18,
  lineHeight: 1.6,
  color: "#0f172a",
};

const optionsListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const optionLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fafbfc",
  cursor: "pointer",
};

const optionLabelCheckedStyle = {
  borderColor: "#93c5fd",
  background: "#eff6ff",
};

const optionCorrectStyle = {
  borderColor: "#6ee7b7",
  background: "#ecfdf5",
};

const optionWrongStyle = {
  borderColor: "#fca5a5",
  background: "#fef2f2",
};

const radioStyle = {
  width: 18,
  height: 18,
  accentColor: "#2563eb",
};

const optionNumStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 8,
  background: "white",
  border: "1px solid #cbd5e1",
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
  flexShrink: 0,
};

const textareaStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 15,
  lineHeight: 1.7,
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily: "inherit",
};

const selectStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 15,
  background: "white",
};

const wordBankStyle = {
  marginBottom: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#fffbeb",
  border: "1px solid #fde68a",
};

const wordBankRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
};

const wordChipStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "white",
  border: "1px solid #fcd34d",
  fontSize: 13,
};

const feedbackStyle = {
  marginTop: 16,
  padding: "12px 14px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
};

const navRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 20px",
  borderTop: "1px solid #e2e8f0",
  flexWrap: "wrap",
};

const navBtnStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const navBtnPrimaryStyle = {
  ...navBtnStyle,
  border: "none",
  background: "#2563eb",
  color: "white",
  marginLeft: "auto",
};

const submitBtnStyle = {
  ...navBtnPrimaryStyle,
  background: "#2563eb",
  cursor: "pointer",
  marginLeft: "auto",
};

const emptyWrapStyle = {
  padding: 40,
  textAlign: "center",
  background: "white",
  borderRadius: 16,
};
