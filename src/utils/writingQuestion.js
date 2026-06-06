export const WRITING_GUIDE_TEXT = "주어진 단어 활용 (변형 가능)";

export function isWritingQuestion(question) {
  return (
    question?.type === "writing" ||
    (question?.subject === "writing" && Boolean(String(question?.givenWords ?? "").trim()))
  );
}

export function normalizeWritingFields(question) {
  if (!isWritingQuestion(question) && question?.subject !== "writing") {
    return question;
  }

  return {
    ...question,
    type: "writing",
    subject: "writing",
    givenWords: String(question.givenWords ?? "").trim(),
  };
}
