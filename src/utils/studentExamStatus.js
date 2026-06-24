import { evaluateCutoff } from "./cutoffPolicy";
import {
  countIncorrectAnswers,
  isClinicRetestAllCorrect,
} from "./incorrectAnswerClinic";
import { ensureArray } from "./safeData";

export function findStudentResultForExam(results, examId, studentKey) {
  return (
    ensureArray(results)
      .filter(
        (result) =>
          result?.testId === examId &&
          (result.studentId === studentKey || result.studentName === studentKey)
      )
      .sort(
        (a, b) =>
          new Date(b?.submittedAt || 0).getTime() -
          new Date(a?.submittedAt || 0).getTime()
      )[0] ?? null
  );
}

export function isStudentExamFullyComplete(result) {
  if (!result) return false;

  const { needsRetest } = evaluateCutoff(result);
  if (needsRetest) return false;

  const incorrectCount = countIncorrectAnswers(result);
  if (incorrectCount === 0) return true;

  return isClinicRetestAllCorrect(result);
}

export function getStudentExamStatus(examId, results, studentKey) {
  const result = findStudentResultForExam(results, examId, studentKey);
  return {
    result,
    hasAttempt: Boolean(result),
    complete: isStudentExamFullyComplete(result),
  };
}

export function isExamStartBlocked(examId, results, studentKey, { allowReview = false } = {}) {
  if (allowReview) return false;
  return getStudentExamStatus(examId, results, studentKey).complete;
}
