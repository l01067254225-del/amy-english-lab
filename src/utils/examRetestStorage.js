import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import {
  attachStudentAnswerFields,
  isAnswerMissingForDisplay,
  resolveDetailStudentAnswer,
  resolveOriginalStudentAnswer,
} from "./resultAnswerStorage";
import {
  appendTestAttemptToResult,
  ATTEMPT_TYPES,
  getFirstAttemptWrongAnswer,
  getRetestReviewQuestionIds,
  getTestAttempts,
  resolveFirstExamAnswer,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";
import { ensureArray } from "./safeData";

function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

export function formatStoredUserAnswer(question, userAnswer) {
  if (isAnswerMissingForDisplay(userAnswer)) {
    return "(미입력)";
  }

  const raw = typeof userAnswer === "string" ? userAnswer : String(userAnswer);

  if (question?.type === "objective") {
    const trimmed = raw.trim();
    const numericIndex = Number(trimmed) - 1;
    if (Number.isFinite(numericIndex) && numericIndex >= 0) {
      const optionText = ensureArray(question.options)[numericIndex];
      if (optionText) return `${trimmed}번 · ${optionText}`;
    }

    const matchedIndex = ensureArray(question.options).findIndex(
      (option) => String(option).trim() === trimmed
    );
    if (matchedIndex >= 0) {
      return `${matchedIndex + 1}번 · ${question.options[matchedIndex]}`;
    }
  }

  return raw;
}

export function getRetestReviewItems(result) {
  if (!result) return [];

  const questions = ensureArray(getExamByTestId(result.testId)?.questions);
  const synced = syncWrongAnswerHistoryOnResult(result);
  const reviewQuestionIds = getRetestReviewQuestionIds(synced);

  return ensureArray(synced.details)
    .filter((detail) => detail && reviewQuestionIds.has(detail.questionId))
    .map((detail) => {
      const question = resolveQuestionForDetail(questions, detail);
      if (!question) return null;

      const wrongAnswer = getFirstAttemptWrongAnswer(synced, detail.questionId);

      return {
        num: detail.num,
        questionId: detail.questionId,
        question,
        wrongAnswer,
        wrongAttempts: detail.wrongAnswerHistory ?? [],
        userAnswer: wrongAnswer,
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
    const userAnswer = resolveDetailStudentAnswer(newDetail, newRecord);

    const prevSynced = previousResult ? syncWrongAnswerHistoryOnResult(previousResult) : null;
    const firstAttemptResolved = prevSynced
      ? resolveFirstExamAnswer(prevSynced, {
          questionId: newDetail.questionId,
          num: newDetail.num,
        })
      : null;

    const previousUserAnswer =
      firstAttemptResolved?.status === "found"
        ? firstAttemptResolved.user_answer
        : previousDetail
          ? resolveOriginalStudentAnswer(previousDetail, previousResult) ??
            resolveDetailStudentAnswer(previousDetail, previousResult)
          : null;

    let baseDetail = attachStudentAnswerFields(newDetail, userAnswer ?? "");

    if (previousDetail?.firstSubmissionUserAnswer != null) {
      baseDetail = {
        ...baseDetail,
        firstSubmissionUserAnswer: previousDetail.firstSubmissionUserAnswer,
      };
    } else if (previousUserAnswer != null) {
      baseDetail = {
        ...baseDetail,
        firstSubmissionUserAnswer: previousUserAnswer,
      };
    }

    if (!wasWrong) {
      return baseDetail;
    }

    const examRetestPayload = {
      passed: nowCorrect,
      correct: nowCorrect,
      userAnswer: userAnswer ?? "",
      studentAnswer: userAnswer ?? "",
      userResponse: userAnswer ?? "",
      previousUserAnswer: previousUserAnswer ?? "",
      submittedAt: newRecord.submittedAt,
      attemptNumber: Number(newRecord.attemptCount ?? 1),
    };

    return {
      ...baseDetail,
      retested: true,
      examRetest: examRetestPayload,
    };
  });

  const score = mergedDetails.filter((detail) => detail.correct).length;

  const mergedBase = {
    ...newRecord,
    score,
    total: mergedDetails.length,
    details: mergedDetails,
    ...(previousResult?.clinicRetest ? { clinicRetest: previousResult.clinicRetest } : {}),
  };

  let combined = previousResult ? syncWrongAnswerHistoryOnResult(previousResult) : null;

  const hasFirstAttempt = combined
    ? getTestAttempts(combined).some((attempt) => Number(attempt.attemptNumber) === 1)
    : false;

  if (!hasFirstAttempt && previousResult) {
    combined = appendTestAttemptToResult(
      null,
      {
        ...previousResult,
        details: previousDetails,
        submittedAt: previousResult.submittedAt,
        attemptCount: 1,
        score: Number(previousResult.score ?? 0),
        total: Number(previousResult.total ?? mergedDetails.length),
      },
      ATTEMPT_TYPES.EXAM
    );
  }

  combined = appendTestAttemptToResult(combined, mergedBase, ATTEMPT_TYPES.RETEST);

  return syncWrongAnswerHistoryOnResult({
    ...mergedBase,
    test_attempts: combined.test_attempts,
    attempt_logs: combined.attempt_logs,
    answer_logs: combined.answer_logs,
    attempt_history: combined.attempt_history,
  });
}

export function isExamRetestPassedDetail(detail) {
  return Boolean(detail?.examRetest?.passed);
}

export function countExamRetestPassed(result) {
  return ensureArray(result?.details).filter(isExamRetestPassedDetail).length;
}
