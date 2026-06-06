import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { ensureArray } from "./safeData";

function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

export function formatStoredUserAnswer(question, userAnswer) {
  const raw = String(userAnswer ?? "").trim();
  if (!raw) return "(미입력)";

  if (question?.type === "objective") {
    const optionIndex = Number(raw) - 1;
    const optionText = ensureArray(question.options)[optionIndex];
    if (optionText) return `${raw}번 · ${optionText}`;
  }

  return raw;
}

export function getRetestReviewItems(result) {
  if (!result) return [];

  const questions = ensureArray(getExamByTestId(result.testId)?.questions);

  return ensureArray(result.details)
    .filter((detail) => detail && detail.correct === false)
    .map((detail) => {
      const question = resolveQuestionForDetail(questions, detail);
      if (!question) return null;

      return {
        num: detail.num,
        questionId: detail.questionId,
        question,
        userAnswer: detail.userAnswer ?? "",
        correctAnswer: formatQuestionAnswer(question),
      };
    })
    .filter(Boolean);
}

export function countRetestReviewItems(result) {
  return getRetestReviewItems(result).length;
}

export function mergeExamRetestResult(previousResult, newRecord) {
  const previousDetails = ensureArray(previousResult?.details);
  const prevByQuestionId = new Map(
    previousDetails
      .filter((detail) => detail?.questionId)
      .map((detail) => [detail.questionId, detail])
  );

  const mergedDetails = ensureArray(newRecord.details).map((newDetail) => {
    const previousDetail = prevByQuestionId.get(newDetail.questionId);
    const wasWrong = previousDetail && previousDetail.correct === false;
    const nowCorrect = newDetail.correct === true;

    if (!wasWrong) {
      return { ...newDetail };
    }

    return {
      ...newDetail,
      retested: true,
      examRetest: {
        passed: nowCorrect,
        correct: nowCorrect,
        userAnswer: newDetail.userAnswer ?? "",
        previousUserAnswer: previousDetail.userAnswer ?? "",
        submittedAt: newRecord.submittedAt,
        attemptNumber: Number(newRecord.attemptCount ?? 1),
      },
    };
  });

  const score = mergedDetails.filter((detail) => detail.correct).length;

  return {
    ...newRecord,
    score,
    total: mergedDetails.length,
    details: mergedDetails,
    ...(previousResult?.clinicRetest ? { clinicRetest: previousResult.clinicRetest } : {}),
  };
}

export function isExamRetestPassedDetail(detail) {
  return Boolean(detail?.examRetest?.passed);
}

export function countExamRetestPassed(result) {
  return ensureArray(result?.details).filter(isExamRetestPassedDetail).length;
}
