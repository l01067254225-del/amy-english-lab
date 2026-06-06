export function buildExamTakeView(questions) {
  if (!questions?.length) {
    return { mode: "default", questions: [], passage: "" };
  }

  const readingQuestions = questions.filter((q) => q.subject === "reading");
  if (readingQuestions.length === questions.length) {
    const passageId = readingQuestions[0].passageId || readingQuestions[0].id;
    const group = readingQuestions.filter(
      (q) => (q.passageId || q.id) === passageId
    );
    const passage = group[0]?.passage?.trim() || "";

    if (group.length === questions.length && passage) {
      return { mode: "reading", questions: group, passage };
    }
  }

  return { mode: "default", questions, passage: "" };
}

export function shouldShowReadingPassage(question, questions, index) {
  if (question.subject !== "reading" || !question.passage?.trim()) return false;
  const passageKey = question.passageId || question.id;
  const firstIndex = questions.findIndex(
    (q) => (q.passageId || q.id) === passageKey && q.passage?.trim()
  );
  return firstIndex === index;
}
