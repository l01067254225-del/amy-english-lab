import { resolveQuestionForDetail } from "./cutoffPolicy";
import { isAnswerCorrect } from "./grade";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { ensureArray } from "./safeData";
import {
  enrichIncorrectItemsWithClinic,
  isClinicRetestCompleted,
} from "./clinicRetestStorage";
import {
  getFirstAttemptWrongAnswer,
  getOriginallyWrongQuestionIds,
  isOriginallyWrongDetail,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";

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

/** 1차 시험에서 틀린 문항 — 재시험 통과 후에도 포함 */
export function getIncorrectQuestionItems(result) {
  if (!result) return [];

  const synced = syncWrongAnswerHistoryOnResult(result);
  const questions = ensureArray(getExamByTestId(synced.testId)?.questions);
  const originallyWrongIds = getOriginallyWrongQuestionIds(synced);

  return ensureArray(synced.details)
    .filter((detail) => isOriginallyWrongDetail(detail, synced))
    .map((detail) => {
      const question = resolveQuestionForDetail(questions, detail);
      if (!question) return null;

      const userAnswer =
        getFirstAttemptWrongAnswer(synced, detail.questionId, detail.num) ?? "";

      if (isAnswerCorrect(question, userAnswer)) {
        return null;
      }

      return {
        num: detail.num,
        questionId: detail.questionId,
        question,
        isCorrect: false,
        userAnswer,
        correctAnswer: formatQuestionAnswer(question),
        wasOriginallyWrong: originallyWrongIds.has(detail.questionId),
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
