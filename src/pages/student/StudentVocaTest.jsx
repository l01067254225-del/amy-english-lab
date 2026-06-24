import { useMemo } from "react";
import ExamTakeScoreBar from "../../components/ExamTakeScoreBar";
import { getAnswerFeedback, gradeQuestion } from "../../utils/grade";
import { splitVocaExamSections, resolveVocaMeaningPrompt, resolveVocaSpellingPrompt } from "../../utils/vocaExamBuilder";

const EMPTY_SECTIONS = {
  meaning: [],
  spelling: [],
  meaningRange: "",
  spellingRange: "",
  halfIndex: 0,
  totalCount: 0,
  isMixExam: false,
};

function VocaQuestionRow({ item, userAnswers, submitted, onAnswer, placeholder, sectionKind }) {
  const question = item?.question;
  if (!question?.id) return null;

  const number = item.number ?? 0;
  const answer = userAnswers[question.id] ?? "";
  const isCorrect = submitted ? gradeQuestion(question, answer) === 1 : false;
  const promptText =
    sectionKind === "spelling"
      ? resolveVocaSpellingPrompt(question)
      : resolveVocaMeaningPrompt(question);

  return (
    <div style={styles.row}>
      <div style={styles.questionLabel}>
        Q{number}. <span style={styles.promptText}>{promptText}</span>
      </div>
      <input
        type="text"
        value={answer}
        disabled={submitted}
        onChange={(event) => onAnswer(question.id, event.target.value)}
        placeholder={placeholder}
        style={{
          ...styles.input,
          backgroundColor: submitted ? "#f1f5f9" : "#f8fafc",
        }}
      />
      {submitted ? (
        <p
          style={{
            ...styles.feedback,
            color: isCorrect ? "#059669" : "#ef4444",
          }}
        >
          {getAnswerFeedback(question)}
        </p>
      ) : null}
    </div>
  );
}

function VocaSectionBlock({
  title,
  rangeLabel,
  items,
  userAnswers,
  submitted,
  onAnswer,
  placeholder,
  showDivider,
  sectionKind,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const sectionStyle = showDivider ? styles.spellingSection : styles.meaningSection;

  return (
    <section style={sectionStyle}>
      <h2 style={styles.sectionTitle}>
        {title}{" "}
        {rangeLabel ? <span style={styles.sectionRange}>[{rangeLabel}]</span> : null}
      </h2>
      <div style={styles.questionList}>
        {items.map((item) => (
          <VocaQuestionRow
            key={item.question.id}
            item={item}
            userAnswers={userAnswers}
            submitted={submitted}
            onAnswer={onAnswer}
            placeholder={placeholder}
            sectionKind={sectionKind}
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
  onAnswer = () => {},
  hasAnyAnswer = false,
  onClearAll,
}) {
  const sections = useMemo(() => {
    if (!Array.isArray(questions) || questions.length === 0) {
      return EMPTY_SECTIONS;
    }
    return splitVocaExamSections(questions);
  }, [questions]);

  const totalCount = questions.length;
  const meaningRange =
    sections.meaningRange ||
    (sections.meaning.length > 0 ? `1-${sections.meaning.length}` : "");
  const spellingRange =
    sections.spellingRange ||
    (sections.spelling.length > 0
      ? `${totalCount - sections.spelling.length + 1}-${totalCount}`
      : "");

  return (
    <div style={styles.card}>
      <ExamTakeScoreBar
        total={totalCount}
        submitted={submitted}
        hasAnswers={hasAnyAnswer}
        onClearAll={onClearAll}
        style={styles.scoreHeader}
      />

      <VocaSectionBlock
        title="다음 단어의 뜻을 쓰시오."
        rangeLabel={meaningRange}
        items={sections.meaning}
        userAnswers={userAnswers}
        submitted={submitted}
        onAnswer={onAnswer}
        placeholder="한글 뜻 입력"
        showDivider={false}
        sectionKind="meaning"
      />

      <VocaSectionBlock
        title="다음 뜻에 해당하는 영어 철자를 쓰시오."
        rangeLabel={spellingRange}
        items={sections.spelling}
        userAnswers={userAnswers}
        submitted={submitted}
        onAnswer={onAnswer}
        placeholder="영어 철자 입력"
        showDivider={sections.meaning.length > 0}
        sectionKind="spelling"
      />
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#ffffff",
    padding: 32,
    borderRadius: 16,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    border: "1px solid #f1f5f9",
  },
  scoreHeader: {
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: "1px solid #f1f5f9",
  },
  meaningSection: {
    marginBottom: 48,
  },
  spellingSection: {
    marginTop: 48,
    paddingTop: 32,
    borderTop: "2px dashed #f1f5f9",
  },
  sectionTitle: {
    margin: "0 0 24px",
    fontSize: 18,
    fontWeight: 800,
    color: "#2563eb",
    lineHeight: 1.5,
  },
  sectionRange: {
    color: "#94a3b8",
    fontWeight: 500,
    fontSize: 16,
  },
  questionList: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  row: {
    paddingBottom: 24,
    borderBottom: "1px solid #f8fafc",
  },
  questionLabel: {
    marginBottom: 12,
    fontWeight: 800,
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 1.5,
  },
  promptText: {
    marginLeft: 4,
    fontSize: 20,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxSizing: "border-box",
    fontSize: 15,
    outline: "none",
  },
  feedback: {
    margin: "8px 0 0",
    fontSize: 14,
    fontWeight: 600,
  },
};
