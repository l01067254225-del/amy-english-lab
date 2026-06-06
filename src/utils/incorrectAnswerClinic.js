import { resolveQuestionForDetail } from "./cutoffPolicy";
import { loadExamSets } from "./questionBankStorage";
import { ensureArray } from "./safeData";

export function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

export function getIncorrectQuestionItems(result) {
  if (!result) return [];

  const questions = ensureArray(getExamByTestId(result.testId)?.questions);
  const details = ensureArray(result.details);

  return details
    .filter((detail) => detail && detail.correct === false)
    .map((detail) => {
      const question = resolveQuestionForDetail(questions, detail);
      if (!question) return null;
      return {
        num: detail.num,
        question,
      };
    })
    .filter(Boolean);
}

export function countIncorrectAnswers(result) {
  return getIncorrectQuestionItems(result).length;
}
