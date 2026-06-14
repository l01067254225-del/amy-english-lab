import { useMemo } from "react";
import { getAnswerFeedback, gradeQuestion } from "../../utils/grade";
import { splitVocaExamSections } from "../../utils/vocaExamBuilder";

function VocaQuestionRow({
  question,
  number,
  userAnswer,
  submitted,
  onAnswer,
  sectionKind,
}) {
  const earned = submitted ? gradeQuestion(question, userAnswer) : null;
  const placeholder =
    sectionKind === "spelling" ? "영어 철자 입력" : "한글 뜻 입력";

  return (
    <div style={rowStyle}>
      <div style={promptRowStyle}>
        <div style={promptStyle}>
          Q{number}. {question.prompt}
        </div>
        {submitted && (
          <span
            style={{
              ...resultBadgeStyle,
              color: earned === 1 ? "#047857" : "#b91c1c",
            }}
          >
            {earned === 1 ? "정답(1)" : "오답(0)"}
          </span>
        )}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={userAnswer}
        disabled={submitted}
        onChange={(event) => onAnswer(question.id, event.target.value)}
        style={{
          ...inputStyle,
          background:
            submitted && earned === 1
              ? "#ecfdf5"
              : submitted
                ? "#fef2f2"
                : "#f8fafc",
          borderColor:
            submitted && earned === 1
              ? "#6ee7b7"
              : submitted
                ? "#fecaca"
                : "#e2e8f0",
        }}
      />
      {submitted && earned === 0 && (
        <p style={feedbackStyle}>{getAnswerFeedback(question)}</p>
      )}
    </div>
  );
}

function VocaSection({
  title,
  rangeLabel,
  questions,
  startNumber,
  answers,
  submitted,
  onAnswer,
  sectionKind,
  withTopDivider = false,
}) {
  if (!questions.length) return null;

  return (
    <section
      style={{
        ...sectionStyle,
        ...(withTopDivider ? sectionDividerStyle : null),
      }}
    >
      <h2 style={sectionTitleStyle}>
        {title} <span style={sectionRangeStyle}>{rangeLabel}</span>
      </h2>
      <div style={sectionListStyle}>
        {questions.map((question, index) => (
          <VocaQuestionRow
            key={question.id}
            question={question}
            number={startNumber + index}
            userAnswer={answers[question.id] ?? ""}
            submitted={submitted}
            onAnswer={onAnswer}
            sectionKind={sectionKind}
          />
        ))}
      </div>
    </section>
  );
}

export default function StudentVocaTest({
  questions,
  answers,
  submitted,
  saving,
  onAnswer,
  onSubmit,
  onReset,
}) {
  const { meaningSection, spellingSection, halfIndex, totalCount, isMixExam } = useMemo(
    () => splitVocaExamSections(questions),
    [questions]
  );

  const meaningRange = isMixExam
    ? `[1-${halfIndex}]`
    : meaningSection.length > 0
      ? `[1-${totalCount}]`
      : "";
  const spellingRange = isMixExam
    ? `[${halfIndex + 1}-${totalCount}]`
    : spellingSection.length > 0
      ? `[1-${totalCount}]`
      : "";

  return (
    <>
      <VocaSection
        title="다음 단어의 뜻을 쓰시오."
        rangeLabel={meaningRange}
        questions={meaningSection}
        startNumber={1}
        answers={answers}
        submitted={submitted}
        onAnswer={onAnswer}
        sectionKind="meaning"
      />

      <VocaSection
        title="다음 뜻에 해당하는 영어 철자를 쓰시오."
        rangeLabel={spellingRange}
        questions={spellingSection}
        startNumber={halfIndex + 1}
        answers={answers}
        submitted={submitted}
        onAnswer={onAnswer}
        sectionKind="spelling"
        withTopDivider={meaningSection.length > 0}
      />

      <div style={actionRowStyle}>
        {!submitted ? (
          <button type="button" onClick={onSubmit} disabled={saving} style={submitBtnStyle}>
            {saving ? "저장 중..." : "제출"}
          </button>
        ) : (
          <button type="button" onClick={onReset} style={secondaryBtnStyle}>
            다시 풀기
          </button>
        )}
      </div>
    </>
  );
}

const sectionStyle = {
  marginBottom: 48,
};

const sectionDividerStyle = {
  paddingTop: 24,
  borderTop: "2px dashed #e2e8f0",
};

const sectionTitleStyle = {
  margin: "0 0 24px",
  fontSize: 18,
  fontWeight: 800,
  color: "#2563eb",
  lineHeight: 1.5,
};

const sectionRangeStyle = {
  color: "#94a3b8",
  fontWeight: 500,
};

const sectionListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const rowStyle = {
  paddingBottom: 24,
  borderBottom: "1px solid #f1f5f9",
};

const promptRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

const promptStyle = {
  fontWeight: 800,
  color: "#0f172a",
  fontSize: 16,
  lineHeight: 1.6,
};

const resultBadgeStyle = {
  fontWeight: 800,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  fontSize: 15,
  outline: "none",
};

const feedbackStyle = {
  margin: "10px 0 0",
  color: "#b91c1c",
  fontSize: 14,
};

const actionRowStyle = {
  display: "flex",
  gap: 10,
  marginTop: 8,
};

const submitBtnStyle = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryBtnStyle = {
  ...submitBtnStyle,
  background: "white",
  color: "#334155",
  border: "1px solid #ddd",
};
