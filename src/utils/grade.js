export function normalize(text) {
  return (text ?? "").trim();
}

export function normalizeSentence(text) {
  return normalize(text)
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
}

function keysToSentence(question, storedAnswer) {
  if (!storedAnswer) return "";
  const keys = storedAnswer.split("||");
  return keys
    .map((key) => question.shuffledWords?.find((item) => item.key === key)?.word)
    .filter(Boolean)
    .join(" ");
}

export function gradeQuestion(question, userAnswer) {
  if (question.type === "sentence") {
    const userSentence = keysToSentence(question, userAnswer);
    return normalizeSentence(userSentence) === normalizeSentence(question.answer) ? 1 : 0;
  }

  const user = normalize(userAnswer).toLowerCase();
  const answer = normalize(question.answer).toLowerCase();

  switch (question.type) {
    case "objective": {
      const correctIndex = Number(question.answer) - 1;
      const correctOption = question.options?.[correctIndex];
      if (correctOption && user === normalize(correctOption).toLowerCase()) return 1;
      return user === answer ? 1 : 0;
    }
    case "mcq":
    case "short":
    case "subjective":
    case "meaning":
    case "spelling":
    case "fill":
      return user === answer ? 1 : 0;
    default:
      return 0;
  }
}

export function flattenQuestions(baseQuestions) {
  const flat = [];

  for (const question of baseQuestions) {
    if (question.type === "reading-fill") {
      for (const blank of question.blanks) {
        flat.push({
          id: blank.id,
          type: "fill",
          num: blank.num,
          answer: blank.answer,
          passage: question.passage,
          wordBank: question.wordBank,
          readingId: question.id,
          prompt: `빈칸 (${blank.num})에 알맞은 단어를 고르세요`,
        });
      }
    } else {
      flat.push(question);
    }
  }

  return flat;
}

export function getAnswerFeedback(question) {
  if (question.type === "objective") {
    const correctIndex = Number(question.answer) - 1;
    const correctOption = question.options?.[correctIndex];
    return correctOption
      ? `정답: ${question.answer}번 · ${correctOption}`
      : `정답: ${question.answer}번`;
  }
  return `정답: ${question.answer}`;
}
