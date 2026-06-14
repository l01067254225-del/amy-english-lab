import { getQuestionPassageText } from "./readingPassage";

export function buildExamTakeView(questions) {
  if (!questions?.length) {
    return { mode: "default", questions: [], passage: "" };
  }

  const readingQuestions = questions.filter((q) => q.subject === "reading");
  const allReading = readingQuestions.length === questions.length;
  const hasPassageText = readingQuestions.some((q) => getQuestionPassageText(q));

  if (allReading && hasPassageText) {
    return {
      mode: "reading",
      questions,
      passage: getQuestionPassageText(readingQuestions[0]),
    };
  }

  const allVocab =
    questions.length > 0 &&
    questions.every((q) => q.subject === "vocab") &&
    questions.every((q) => q.type === "meaning" || q.type === "spelling");

  if (allVocab) {
    return { mode: "vocab", questions, passage: "" };
  }

  return { mode: "default", questions, passage: "" };
}

export function shouldShowReadingPassage(question, questions, index) {
  if (question.subject !== "reading" || !getQuestionPassageText(question)) return false;
  const passageKey = question.passageId || question.id;
  const firstIndex = questions.findIndex(
    (q) => (q.passageId || q.id) === passageKey && getQuestionPassageText(q)
  );
  return firstIndex === index;
}
