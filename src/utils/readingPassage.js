export function createPassageId() {
  return `pg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function truncatePassage(text, maxLength = 120) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

export function buildQuestionDisplayList(questions) {
  const seenPassageIds = new Set();
  const items = [];

  questions.forEach((question) => {
    const passageText = question.readingPassage ?? question.passage;
    const isGroupedReading =
      question.subject === "reading" && question.passageId && passageText;

    if (isGroupedReading) {
      if (seenPassageIds.has(question.passageId)) return;
      seenPassageIds.add(question.passageId);

      const groupQuestions = questions.filter(
        (item) => item.passageId === question.passageId
      );
      items.push({
        type: "readingGroup",
        passageId: question.passageId,
        passage: passageText,
        readingPassage: passageText,
        questions: groupQuestions,
      });
      return;
    }

    items.push({ type: "single", question });
  });

  return items;
}
