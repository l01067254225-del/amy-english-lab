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
  if (!source.includes("/")) return [source];
  return source
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function hasMultipleAcceptedAnswers(answerText) {
  return splitAcceptedAnswers(answerText).length > 1;
}

/** UI·오답 노트용 정답 표시 문자열 */
export function formatAcceptedAnswerDisplay(answerText) {
  const accepted = splitAcceptedAnswers(answerText);
  if (accepted.length === 0) return "";
  if (accepted.length === 1) return accepted[0];
  return accepted.join(" / ");
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
  return question?.type === "writing" || question?.subject === "writing";
}

function matchesAnyAccepted(userAnswer, acceptedAnswers, { strict = false, normalizeFn } = {}) {
  const normalizeAnswer =
    normalizeFn ?? (strict ? normalizeStrictAnswer : normalizeShortAnswer);
  const userNorm = normalizeAnswer(userAnswer);
  if (!userNorm) return false;

  return acceptedAnswers.some(
    (accepted) => normalizeAnswer(accepted) === userNorm
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

function gradeTextAnswer(question, userAnswer, { strict = false, normalizeFn } = {}) {
  const trimmedUser = normalize(userAnswer);
  const accepted = splitAcceptedAnswers(question.answer);
  if (accepted.length === 0) return 0;

  return matchesAnyAccepted(trimmedUser, accepted, {
    strict,
    normalizeFn,
  })
    ? 1
    : 0;
}

function matchesObjectivePart(question, acceptedPart, trimmedUser) {
  const userLower = trimmedUser.toLowerCase();
  const partNorm = normalize(acceptedPart).toLowerCase();

  if (userLower === partNorm) return true;

  const correctIndex = Number(acceptedPart) - 1;
  if (Number.isFinite(correctIndex) && correctIndex >= 0) {
    const correctOption = question.options?.[correctIndex];
    if (correctOption && userLower === normalize(correctOption).toLowerCase()) {
      return true;
    }
    if (userLower === String(correctIndex + 1)) return true;
  }

  return false;
}

function gradeObjective(question, userAnswer) {
  const trimmedUser = normalize(userAnswer);
  if (!trimmedUser) return 0;

  const accepted = splitAcceptedAnswers(question.answer);
  if (accepted.length === 0) return 0;

  if (accepted.length > 1) {
    return accepted.some((part) => matchesObjectivePart(question, part, trimmedUser)) ? 1 : 0;
  }

  return matchesObjectivePart(question, accepted[0], trimmedUser) ? 1 : 0;
}

function gradeSentence(question, userAnswer) {
  const userSentence = keysToSentence(question, userAnswer);
  const accepted = splitAcceptedAnswers(question.answer);
  if (accepted.length === 0) return 0;

  return matchesAnyAccepted(userSentence, accepted, {
    normalizeFn: normalizeSentence,
  })
    ? 1
    : 0;
}

export function isAnswerCorrect(question, userAnswer) {
  return gradeQuestion(question, userAnswer) === 1;
}

export function gradeQuestion(question, userAnswer) {
  if (!question) return 0;

  const type = question.type ?? "subjective";

  if (type === "sentence") {
    return gradeSentence(question, userAnswer);
  }

  if (type === "objective") {
    return gradeObjective(question, userAnswer);
  }

  switch (type) {
    case "mcq":
    case "short":
    case "subjective":
    case "meaning":
    case "spelling":
    case "writing":
    case "fill":
      return gradeTextAnswer(question, userAnswer, {
        strict: isStrictTextQuestion(question),
      });
    default:
      return gradeTextAnswer(question, userAnswer, {
        strict: isStrictTextQuestion(question),
      });
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
    const accepted = splitAcceptedAnswers(question.answer);
    if (accepted.length > 1) {
      const labels = accepted.map((part) => {
        const index = Number(part) - 1;
        const optionText = question.options?.[index];
        return optionText ? `${part}번 · ${optionText}` : `${part}번`;
      });
      return `정답: ${labels.join(" / ")}`;
    }

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
