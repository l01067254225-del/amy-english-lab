import { useMemo } from "react";
import { getAnswerFeedback, gradeQuestion } from "../../utils/grade";
import { splitVocaExamSections } from "../../utils/vocaExamBuilder";

function VocaQuestionRow({ item, userAnswers, submitted, onAnswer, placeholder }) {
  const { question, number } = item;
  const answer = userAnswers[question.id] ?? "";
  const isCorrect = submitted ? gradeQuestion(question, answer) === 1 : false;
  const promptText = question.prompt || question.text || "";

  return (
    <div style={rowStyle}>
      <div style={questionLabelStyle}>
        Q{number}. <span style={promptTextStyle}>{promptText}</span>
      </div>
      <input
        type="text"
        value={answer}
        disabled={submitted}
        onChange={(event) => onAnswer(question.id, event.target.value)}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          background: submitted ? "#f1f5f9" : "#f8fafc",
        }}
      />
      {submitted && (
        <p
          style={{
            ...feedbackStyle,
            color: isCorrect ? "#059669" : "#ef4444",
          }}
        >
          {getAnswerFeedback(question)}
        </p>
      )}
    </div>
  );
}

function VocaSection({ title, range, items, userAnswers, submitted, onAnswer, placeholder, withDivider }) {
  if (!items.length) return null;

  return (
    <section style={withDivider ? spellingSectionStyle : meaningSectionStyle}>
      <h2 style={sectionTitleStyle}>
        {title}{" "}
        <span style={sectionRangeStyle}>[{range}]</span>
      </h2>
      <div style={questionListStyle}>
        {items.map((item) => (
          <VocaQuestionRow
            key={item.question.id}
            item={item}
            userAnswers={userAnswers}
            submitted={submitted}
            onAnswer={onAnswer}
            placeholder={placeholder}
          />
        ))}
      </div>
    </section>
  );
}

export default function StudentVocaTest({
  questions = [],
  userAnswers = {},
  submitted = false,
  onAnswer,
}) {
  const sections = useMemo(() => splitVocaExamSections(questions), [questions]);
  const totalCount = questions.length;

  return (
    <div style={cardStyle}>
      <div style={scoreHeaderStyle}>문항당 1점 · 총 {totalCount}점</div>

      <VocaSection
        title="다음 단어의 뜻을 쓰시오."
        range={sections.meaningRange || `1-${sections.meaning.length}`}
        items={sections.meaning}
        userAnswers={userAnswers}
        submitted={submitted}
        onAnswer={onAnswer}
        placeholder="한글 뜻 입력"
      />

      <VocaSection
        title="다음 뜻에 해당하는 영어 철자를 쓰시오."
        range={
          sections.spellingRange ||
          (sections.spelling.length > 0
            ? `${totalCount - sections.spelling.length + 1}-${totalCount}`
            : "")
        }
        items={sections.spelling}
        userAnswers={userAnswers}
        submitted={submitted}
        onAnswer={onAnswer}
        placeholder="영어 철자 입력"
        withDivider={sections.meaning.length > 0}
      />
    </div>
  );
}

const cardStyle = {
  background: "#ffffff",
  padding: 32,
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  border: "1px solid #f1f5f9",
};

const scoreHeaderStyle = {
  marginBottom: 32,
  paddingBottom: 16,
  borderBottom: "1px solid #f1f5f9",
  color: "#475569",
  fontWeight: 600,
  fontSize: 16,
};

const meaningSectionStyle = {
  marginBottom: 48,
};

const spellingSectionStyle = {
  marginTop: 48,
  paddingTop: 32,
  borderTop: "2px dashed #f1f5f9",
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
  fontSize: 16,
};

const questionListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const rowStyle = {
  paddingBottom: 24,
  borderBottom: "1px solid #f8fafc",
};

const questionLabelStyle = {
  marginBottom: 12,
  fontWeight: 800,
  color: "#0f172a",
  fontSize: 16,
  lineHeight: 1.5,
};

const promptTextStyle = {
  marginLeft: 4,
  fontSize: 20,
  fontWeight: 700,
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
  margin: "8px 0 0",
  fontSize: 14,
  fontWeight: 600,
};
