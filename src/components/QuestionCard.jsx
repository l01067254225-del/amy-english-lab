import { getAnswerFeedback, gradeQuestion } from "../utils/grade";
import SentenceArrange from "./SentenceArrange";

export default function QuestionCard({
  question,
  index,
  userAnswer,
  submitted,
  onAnswer,
  showPassage,
  showWordBank,
}) {
  const earned = submitted ? gradeQuestion(question, userAnswer) : null;

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 12,
        background:
          submitted && earned === 1
            ? "#ecfdf5"
            : submitted
              ? "#fef2f2"
              : "white",
      }}
    >
      {question.sectionLabel && (
        <h3
          style={{
            margin: "0 0 12px",
            padding: "8px 12px",
            background: "#eff6ff",
            borderRadius: 8,
            color: "#1d4ed8",
            fontSize: 15,
          }}
        >
          {question.sectionLabel}
        </h3>
      )}

      {showPassage && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          <strong>지문</strong>
          <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{question.passage}</p>
        </div>
      )}

      {showWordBank && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <strong>단어 보기</strong>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
            }}
          >
            {question.wordBank.map((word) => (
              <span
                key={word}
                style={{
                  padding: "4px 10px",
                  background: "white",
                  border: "1px solid #fcd34d",
                  borderRadius: 999,
                  fontSize: 14,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 700 }}>
          Q{index + 1}. {question.prompt}
        </div>
        {submitted && (
          <div style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
            {earned === 1 ? "정답(1)" : "오답(0)"}
          </div>
        )}
      </div>

      {question.type === "sentence" ? (
        <SentenceArrange
          question={question}
          userAnswer={userAnswer}
          submitted={submitted}
          onAnswer={onAnswer}
        />
      ) : question.type === "objective" ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {(question.options ?? []).map((option, optionIndex) => (
            <label
              key={`${question.id}-opt-${optionIndex}`}
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                type="radio"
                name={question.id}
                checked={userAnswer === option}
                disabled={submitted}
                onChange={() => onAnswer(question.id, option)}
              />
              <span>
                {optionIndex + 1}. {option}
              </span>
            </label>
          ))}
        </div>
      ) : question.type === "mcq" ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {question.choices.map((choice) => (
            <label
              key={choice}
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                type="radio"
                name={question.id}
                checked={userAnswer === choice}
                disabled={submitted}
                onChange={() => onAnswer(question.id, choice)}
              />
              <span>{choice}</span>
            </label>
          ))}
        </div>
      ) : question.type === "fill" ? (
        <select
          value={userAnswer}
          disabled={submitted}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 15,
          }}
        >
          <option value="">단어 선택</option>
          {question.wordBank.map((word) => (
            <option key={word} value={word}>
              {word}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          placeholder={question.type === "spelling" ? "영어 철자 입력" : "정답 입력"}
          value={userAnswer}
          disabled={submitted}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            boxSizing: "border-box",
            fontSize: 15,
          }}
        />
      )}

      {submitted && earned === 0 && (
        <div style={{ marginTop: 10, color: "#b91c1c" }}>
          {getAnswerFeedback(question)}
        </div>
      )}
    </div>
  );
}
