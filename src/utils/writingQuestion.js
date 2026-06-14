import {
  ensureWordArray,
  formatScrambledWordsForDisplay,
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

export function normalizeWritingFields(question) {
  if (!isWritingQuestion(question) && question?.subject !== "writing") {
    return question;
  }

  const scrambledWords = ensureWordArray(question?.scrambledWords);
  const givenWordsFromField = String(question?.givenWords ?? "").trim();
  const givenWords =
    scrambledWords.length > 0
      ? formatScrambledWordsForDisplay(scrambledWords)
      : givenWordsFromField;

  return {
    ...question,
    type: "writing",
    subject: "writing",
    referenceSentence: String(question?.referenceSentence ?? "").trim(),
    scrambledWords,
    givenWords,
  };
}
