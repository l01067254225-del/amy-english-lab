import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { resolveDetailStudentAnswer } from "./resultAnswerStorage";
import { ensureArray } from "./safeData";
import {
  enrichIncorrectItemsWithClinic,
  isClinicRetestCompleted,
} from "./clinicRetestStorage";

export {
  isClinicRetestCompleted,
  saveClinicRetestResult,
  getClinicRetestSummary,
  enrichIncorrectItemsWithClinic,
  canClinicRetest,
  getClinicRetestRemainingAttempts,
  getClinicRetestAttemptCount,
  getClinicRetestButtonLabel,
  isClinicRetestAllCorrect,
  CLINIC_RETEST_MAX_ATTEMPTS,
} from "./clinicRetestStorage";

export function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

/** details / questions에서 isCorrect=false(또는 correct=false)인 문항만 */
export function isWrongDetail(detail) {
  if (!detail) return false;
  if (detail.isCorrect === false) return true;
  if (detail.correct === false) return true;
  return false;
}

export function getIncorrectQuestionItems(result) {
  if (!result) return [];

  const questions = ensureArray(getExamByTestId(result.testId)?.questions);
  const details = ensureArray(result.details);

  return details
    .filter(isWrongDetail)
    .map((detail) => {
      const question = resolveQuestionForDetail(questions, detail);
      if (!question) return null;

      const userAnswer = resolveDetailStudentAnswer(detail, result);

      return {
        num: detail.num,
        questionId: detail.questionId,
        question,
        isCorrect: false,
        userAnswer: userAnswer ?? "",
        correctAnswer: formatQuestionAnswer(question),
        detail,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.num ?? 0) - Number(b.num ?? 0));
}

export function countIncorrectAnswers(result) {
  return getIncorrectQuestionItems(result).length;
}

export function getIncorrectItemsForPrint(result) {
  return enrichIncorrectItemsWithClinic(result, getIncorrectQuestionItems(result));
}
