import {
  ensureWordArray,
  formatScrambledWordsForDisplay,
  WRITING_DEFAULT_PROMPT,
} from "./parseWritingText";

export const WRITING_GUIDE_TEXT = "주어진 단어 활용 (변형 가능)";

export function isWritingQuestion(question) {
  const scrambledWords = ensureWordArray(question?.scrambledWords);
  const givenWords = String(question?.givenWords ?? "").trim();

  return (
    question?.type === "writing" ||
    (question?.subject === "writing" &&
      (scrambledWords.length > 0 || Boolean(givenWords)))
  );
}

export function getWritingScrambledHint(question) {
  const scrambledWords = ensureWordArray(question?.scrambledWords);
  if (scrambledWords.length > 0) {
    return formatScrambledWordsForDisplay(scrambledWords);
  }
  return String(question?.givenWords ?? "").trim();
}

/**
 * Writing 문항 필드 정규화 — 누락·빈 값을 안전한 기본값으로 채움
 */
export function normalizeWritingFields(question) {
  if (question == null || typeof question !== "object") {
    return {
      type: "writing",
      subject: "writing",
      prompt: WRITING_DEFAULT_PROMPT,
      answer: "",
      referenceSentence: "",
      scrambledWords: [],
      givenWords: "",
    };
  }

  if (!isWritingQuestion(question) && question.subject !== "writing") {
    return question;
  }

  const prompt =
    String(question.prompt ?? "").trim() || WRITING_DEFAULT_PROMPT;
  const answer = String(question.answer ?? "").trim();
  const referenceSentence = String(question.referenceSentence ?? "").trim();

  let scrambledWords = ensureWordArray(question.scrambledWords);
  const givenWordsFromField = String(question.givenWords ?? "").trim();

  if (scrambledWords.length === 0 && givenWordsFromField) {
    scrambledWords = ensureWordArray(givenWordsFromField);
  }

  const givenWords =
    scrambledWords.length > 0
      ? formatScrambledWordsForDisplay(scrambledWords)
      : givenWordsFromField;

  return {
    ...question,
    type: "writing",
    subject: "writing",
    prompt,
    answer,
    referenceSentence,
    scrambledWords,
    givenWords,
    level: String(question.level ?? "").trim(),
  };
}

/** Writing 문항 배열 일괄 정규화 — null/undefined 항목 제외 */
export function normalizeWritingFieldsList(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item != null && typeof item === "object")
    .map((item) => normalizeWritingFields(item));
}
