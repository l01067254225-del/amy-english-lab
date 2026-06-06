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
      const index = Number(detail.num) - 1;
      const question = questions[index];
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
