import { useMemo } from "react";
import { getAnswerFeedback, gradeQuestion } from "../../utils/grade";
import { splitVocaExamSections } from "../../utils/vocaExamBuilder";

function VocaQuestionBlock({ item, userAnswers, submitted, onAnswer, placeholder }) {
  const { question, number } = item;
  const userAnswer = userAnswers[question.id] ?? "";
  const isCorrect = submitted ? gradeQuestion(question, userAnswer) === 1 : null;
  const promptText = question.prompt || question.text || "";

  return (
    <div style={rowStyle}>
      <div style={promptStyle}>
        Q{number}. <span style={promptTextStyle}>{promptText}</span>
      </div>
      <input
        type="text"
        value={userAnswer}
        disabled={submitted}
        onChange={(event) => onAnswer(question.id, event.target.value)}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          background: submitted ? "#f1f5f9" : "#f8fafc",
        }}
      />
      {submitted && (
        <div
          style={{
            ...feedbackStyle,
            color: isCorrect ? "#059669" : "#ef4444",
          }}
        >
          {getAnswerFeedback(question)}
        </div>
      )}
    </div>
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

      {sections.meaning.length > 0 && (
        <section style={meaningSectionStyle}>
          <h2 style={sectionTitleStyle}>
            <span>다음 단어의 뜻을 쓰시오.</span>
            <span style={sectionRangeStyle}>
              [{sections.meaningRange || `1-${sections.meaning.length}`}]
            </span>
          </h2>

          <div style={questionListStyle}>
            {sections.meaning.map((item) => (
              <VocaQuestionBlock
                key={item.question.id}
                item={item}
                userAnswers={userAnswers}
                submitted={submitted}
                onAnswer={onAnswer}
                placeholder="한글 뜻 입력"
              />
            ))}
          </div>
        </section>
      )}

      {sections.spelling.length > 0 && (
        <section style={spellingSectionStyle}>
          <h2 style={sectionTitleStyle}>
            <span>다음 뜻에 해당하는 영어 철자를 쓰시오.</span>
            <span style={sectionRangeStyle}>
              [{sections.spellingRange || `${totalCount - sections.spelling.length + 1}-${totalCount}`}]
            </span>
          </h2>

          <div style={questionListStyle}>
            {sections.spelling.map((item) => (
              <VocaQuestionBlock
                key={item.question.id}
                item={item}
                userAnswers={userAnswers}
                submitted={submitted}
                onAnswer={onAnswer}
                placeholder="영어 철자 입력"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const cardStyle = {
  background: "white",
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
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  margin: "0 0 24px",
  fontSize: 18,
  fontWeight: 800,
  color: "#2563eb",
  lineHeight: 1.5,
};

const sectionRangeStyle = {
  color: "#94a3b8",
  fontWeight: 500,
  fontSize: 14,
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

const promptStyle = {
  fontWeight: 800,
  color: "#0f172a",
  fontSize: 16,
  marginBottom: 12,
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
  marginTop: 8,
  fontSize: 14,
  fontWeight: 600,
};
