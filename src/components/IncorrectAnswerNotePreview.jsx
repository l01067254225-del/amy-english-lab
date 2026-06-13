import { formatStoredUserAnswer } from "../utils/examRetestStorage";
import { formatQuestionAnswer, getSubjectLabel } from "../utils/questionBankStorage";
import { shouldShowReadingPassage } from "../utils/examTakeView";
import { ensureArray } from "../utils/safeData";

function QuestionBlock({ item, index, questions }) {
  const { question, num, userAnswer } = item;
  const showPassage = shouldShowReadingPassage(question, questions, index);
  const isObjective = question.type === "objective";
  const options = ensureArray(question.options);
  const studentAnswerText = formatStoredUserAnswer(question, userAnswer);
  const correctAnswerText = item.correctAnswer ?? formatQuestionAnswer(question);

  return (
    <section className="incorrect-note-item" style={itemStyle}>
      <div style={itemHeaderStyle}>
        <span style={numBadgeStyle}>Q{num}</span>
        {question.subject && (
          <span style={subjectTagStyle}>{getSubjectLabel(question.subject)}</span>
        )}
        <span style={wrongTagStyle}>오답</span>
      </div>

      {showPassage && question.passage?.trim() && (
        <div style={passageBoxStyle}>
          <p style={passageLabelStyle}>[ 지문 ]</p>
          <p style={passageTextStyle}>{question.passage}</p>
        </div>
      )}

      <h3 style={promptStyle}>
        {num}. {question.prompt}
      </h3>

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
          <p style={{ margin: 0, fontSize: 13 }}>{question.wordBank.join(" · ")}</p>
        </div>
      ) : null}

      <div style={answerBoxStyle}>
        <p style={answerRowStyle}>
          <span style={answerLabelStyle}>학생 답안</span>
          <span style={wrongAnswerStyle}>{studentAnswerText || "(미입력)"}</span>
        </p>
        <p style={{ ...answerRowStyle, marginBottom: 0 }}>
          <span style={answerLabelStyle}>정답</span>
          <span style={correctAnswerStyle}>{correctAnswerText}</span>
        </p>
      </div>
    </section>
  );
}

export default function IncorrectAnswerNotePreview({ items, studentName, testTitle, submittedAt }) {
  const safeItems = ensureArray(items);
  if (safeItems.length === 0) {
    return (
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        틀린 문항이 없습니다.
      </p>
    );
  }

  const questions = safeItems.map((item) => item.question);

  return (
    <article className="incorrect-note-sheet" style={sheetStyle}>
      <header style={headerStyle}>
        <p style={brandStyle}>AMY ENGLISH LAB</p>
        <h1 style={titleStyle}>오답 노트 · {studentName || "학생"}</h1>
        {testTitle && <p style={subtitleStyle}>{testTitle}</p>}
        <p style={metaStyle}>
          틀린 문항 {safeItems.length}개
          {submittedAt ? ` · ${submittedAt}` : ""}
        </p>
      </header>

      {safeItems.map((item, index) => (
        <QuestionBlock
          key={`${item.questionId ?? item.question?.id}-${item.num}`}
          item={item}
          index={index}
          questions={questions}
        />
      ))}

      <footer style={footerStyle}>
        <p style={footerTextStyle}>AMY ENGLISH LAB · Incorrect Answer Note</p>
      </footer>
    </article>
  );
}

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
  marginBottom: 20,
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
  fontSize: 20,
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
  marginBottom: 24,
  paddingBottom: 20,
  borderBottom: "1px solid #e2e8f0",
};

const itemHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const numBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 36,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#0f172a",
  color: "white",
  fontSize: 12,
  fontWeight: 800,
};

const subjectTagStyle = {
  padding: "3px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
};

const wrongTagStyle = {
  padding: "3px 10px",
  borderRadius: 999,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  fontSize: 11,
  fontWeight: 800,
  color: "#b91c1c",
};

const passageBoxStyle = {
  marginBottom: 14,
  padding: "14px 16px",
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
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
  borderRadius: 8,
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

const answerBoxStyle = {
  marginTop: 8,
  padding: "12px 14px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const answerRowStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  margin: "0 0 8px",
  fontSize: 14,
  lineHeight: 1.6,
};

const answerLabelStyle = {
  minWidth: 72,
  fontWeight: 800,
  color: "#64748b",
  flexShrink: 0,
};

const wrongAnswerStyle = {
  color: "#b91c1c",
  fontWeight: 700,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const correctAnswerStyle = {
  color: "#047857",
  fontWeight: 700,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const footerStyle = {
  marginTop: 20,
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
