export function normalize(text) {
  return String(text ?? "").trim();
}

export function normalizeSentence(text) {
  return normalize(text)
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
}

/** 슬래시(/)로 구분된 복수 정답을 분리 — 예: "a dog / Choco" */
export function splitAcceptedAnswers(answerText) {
  const source = normalize(answerText);
  if (!source) return [];
  return source
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function collapseWhitespace(text) {
  return normalize(text).replace(/\s+/g, " ");
}

function normalizeShortAnswer(text) {
  return collapseWhitespace(text).toLowerCase();
}

function normalizeStrictAnswer(text) {
  return collapseWhitespace(text);
}

function isStrictTextQuestion(question) {
  return question?.type === "writing";
}

function matchesAnyAccepted(userAnswer, acceptedAnswers, { strict = false } = {}) {
  const normalizeFn = strict ? normalizeStrictAnswer : normalizeShortAnswer;
  const userNorm = normalizeFn(userAnswer);
  if (!userNorm) return false;

  return acceptedAnswers.some(
    (accepted) => normalizeFn(accepted) === userNorm
  );
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

  const trimmedUser = normalize(userAnswer);

  switch (question.type) {
    case "objective": {
      const correctIndex = Number(question.answer) - 1;
      const correctOption = question.options?.[correctIndex];
      const userLower = trimmedUser.toLowerCase();
      const answerLower = normalize(question.answer).toLowerCase();

      if (correctOption && userLower === normalize(correctOption).toLowerCase()) {
        return 1;
      }
      return userLower === answerLower ? 1 : 0;
    }
    case "mcq":
    case "short":
    case "subjective":
    case "meaning":
    case "spelling":
    case "writing":
    case "fill": {
      const accepted = splitAcceptedAnswers(question.answer);
      if (accepted.length === 0) return 0;
      return matchesAnyAccepted(trimmedUser, accepted, {
        strict: isStrictTextQuestion(question),
      })
        ? 1
        : 0;
    }
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

  const accepted = splitAcceptedAnswers(question.answer);
  if (accepted.length > 1) {
    return `정답: ${accepted.join(" / ")}`;
  }

  return `정답: ${question.answer}`;
}
