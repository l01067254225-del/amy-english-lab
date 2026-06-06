import { coalesceStudentAnswer, resolveDetailStudentAnswer } from "./resultAnswerStorage";
import { ensureArray } from "./safeData";

export const ATTEMPT_TYPES = {
  EXAM: "exam",
  RETEST: "retest",
  CLINIC: "clinic",
};

function logTimestamp(log) {
  return new Date(log?.submittedAt || 0).getTime();
}

export function createAnswerLogEntry({
  questionId,
  num,
  userAnswer,
  isCorrect,
  submittedAt,
  attemptNumber,
  attemptType = ATTEMPT_TYPES.EXAM,
}) {
  const serialized = coalesceStudentAnswer(userAnswer) ?? "";
  return {
    questionId,
    num: num ?? null,
    userAnswer: serialized,
    studentAnswer: serialized,
    isCorrect: Boolean(isCorrect),
    correct: Boolean(isCorrect),
    submittedAt: submittedAt ?? new Date().toISOString(),
    attemptNumber: Number(attemptNumber) || 1,
    attemptType,
  };
}

export function buildAnswerLogsFromDetails(details, meta) {
  return ensureArray(details).map((detail) =>
    createAnswerLogEntry({
      questionId: detail.questionId,
      num: detail.num,
      userAnswer: resolveDetailStudentAnswer(detail, meta),
      isCorrect: detail.correct === true,
      submittedAt: meta.submittedAt,
      attemptNumber: meta.attemptNumber,
      attemptType: meta.attemptType,
    })
  );
}

export function buildTestAttemptRecord(result, attemptType) {
  const attemptNumber = Number(result?.attemptCount ?? 1);
  const submittedAt = result?.submittedAt ?? new Date().toISOString();
  const answer_logs = buildAnswerLogsFromDetails(result?.details, {
    ...result,
    attemptNumber,
    attemptType,
    submittedAt,
  });

  return {
    attemptNumber,
    submittedAt,
    attemptType,
    score: Number(result?.score ?? 0),
    total: Number(result?.total ?? 0),
    answer_logs,
  };
}

function sortLogsChronologically(logs) {
  return [...ensureArray(logs)].sort((a, b) => {
    const attemptDiff = Number(a.attemptNumber) - Number(b.attemptNumber);
    if (attemptDiff !== 0) return attemptDiff;
    return logTimestamp(a) - logTimestamp(b);
  });
}

export function getAnswerLogs(result) {
  return sortLogsChronologically(result?.answer_logs);
}

export function getTestAttempts(result) {
  return ensureArray(result?.test_attempts);
}

export function getWrongAnswerLogsForQuestion(result, questionId) {
  if (questionId == null) return [];

  return getAnswerLogs(result).filter(
    (log) =>
      (log.questionId === questionId || String(log.questionId) === String(questionId)) &&
      log.isCorrect === false
  );
}

export function getLatestWrongAnswerRaw(result, questionId, detail = null) {
  const wrongLogs = getWrongAnswerLogsForQuestion(result, questionId);
  if (wrongLogs.length > 0) {
    return wrongLogs[wrongLogs.length - 1].userAnswer;
  }

  const history = ensureArray(detail?.wrongAnswerHistory);
  if (history.length > 0) {
    return history[history.length - 1].userAnswer;
  }

  if (detail?.examRetest) {
    const previousWrong = coalesceStudentAnswer(
      detail.examRetest.previousUserAnswer,
      detail.examRetest.previousStudentAnswer,
      detail.examRetest.previousUserResponse
    );
    if (previousWrong != null) return previousWrong;

    if (detail.examRetest.correct === false) {
      return coalesceStudentAnswer(
        detail.examRetest.userAnswer,
        detail.examRetest.studentAnswer,
        detail.examRetest.userResponse
      );
    }
  }

  if (detail?.clinicRetest?.correct === false) {
    return coalesceStudentAnswer(
      detail.clinicRetest.userAnswer,
      detail.clinicRetest.studentAnswer,
      detail.clinicRetest.userResponse
    );
  }

  if (detail?.correct === false) {
    return resolveDetailStudentAnswer(detail, result);
  }

  return null;
}

export function buildWrongAnswerHistoryForDetail(result, questionId, detail) {
  const logs = getWrongAnswerLogsForQuestion(result, questionId);
  return logs.map((log) => ({
    userAnswer: log.userAnswer,
    submittedAt: log.submittedAt,
    attemptNumber: log.attemptNumber,
    attemptType: log.attemptType,
    isCorrect: false,
  }));
}

function backfillLegacyAttemptLogs(result) {
  const existing = getAnswerLogs(result);
  if (existing.length > 0) {
    return { answer_logs: existing, test_attempts: getTestAttempts(result) };
  }

  const submittedAt = result?.submittedAt ?? new Date().toISOString();
  const attemptNumber = Number(result?.attemptCount ?? 1);
  const answer_logs = buildAnswerLogsFromDetails(result?.details, {
    ...result,
    submittedAt,
    attemptNumber,
    attemptType: attemptNumber > 1 ? ATTEMPT_TYPES.RETEST : ATTEMPT_TYPES.EXAM,
  });

  const test_attempts = [
    {
      attemptNumber,
      submittedAt,
      attemptType: attemptNumber > 1 ? ATTEMPT_TYPES.RETEST : ATTEMPT_TYPES.EXAM,
      score: Number(result?.score ?? 0),
      total: Number(result?.total ?? 0),
      answer_logs,
    },
  ];

  ensureArray(result?.details).forEach((detail) => {
    if (!detail?.examRetest) return;

    const firstWrong = coalesceStudentAnswer(
      detail.examRetest.previousUserAnswer,
      detail.examRetest.previousStudentAnswer
    );
    if (firstWrong == null) return;

    const alreadyHasFirst = answer_logs.some(
      (log) =>
        log.questionId === detail.questionId &&
        log.isCorrect === false &&
        log.attemptNumber <= 1
    );

    if (!alreadyHasFirst) {
      answer_logs.push(
        createAnswerLogEntry({
          questionId: detail.questionId,
          num: detail.num,
          userAnswer: firstWrong,
          isCorrect: false,
          submittedAt,
          attemptNumber: 1,
          attemptType: ATTEMPT_TYPES.EXAM,
        })
      );
    }
  });

  return {
    answer_logs: sortLogsChronologically(answer_logs),
    test_attempts,
  };
}

export function appendTestAttemptToResult(previousResult, nextResult, attemptType) {
  const attemptRecord = buildTestAttemptRecord(nextResult, attemptType);
  const previousAttempts = getTestAttempts(previousResult);
  const previousLogs = previousResult ? getAnswerLogs(previousResult) : [];

  const test_attempts = [...previousAttempts, attemptRecord];
  const answer_logs = sortLogsChronologically([
    ...previousLogs,
    ...attemptRecord.answer_logs,
  ]);

  return {
    ...nextResult,
    test_attempts,
    answer_logs,
  };
}

export function syncWrongAnswerHistoryOnResult(result) {
  const { answer_logs, test_attempts } = backfillLegacyAttemptLogs(result);

  const details = ensureArray(result?.details).map((detail) => {
    const wrongAnswerHistory = buildWrongAnswerHistoryForDetail(
      { ...result, answer_logs },
      detail.questionId,
      detail
    );

    const latestWrong = wrongAnswerHistory.length
      ? wrongAnswerHistory[wrongAnswerHistory.length - 1].userAnswer
      : null;

    return {
      ...detail,
      wrongAnswerHistory,
      ...(latestWrong != null ? { lastWrongAnswer: latestWrong } : {}),
    };
  });

  return {
    ...result,
    details,
    answer_logs,
    test_attempts: test_attempts.length ? test_attempts : getTestAttempts(result),
  };
}

export function hasWrongAnswerHistory(result, questionId, detail = null) {
  return getLatestWrongAnswerRaw(result, questionId, detail) != null;
}

export function detailNeedsRetestReview(detail, result) {
  if (!detail) return false;
  if (detail.correct === false) return true;
  return hasWrongAnswerHistory(result, detail.questionId, detail);
}
