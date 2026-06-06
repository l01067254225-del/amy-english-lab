import { ensureArray } from "./safeData";

export const ATTEMPT_TYPES = {
  EXAM: "exam",
  RETEST: "retest",
  CLINIC: "clinic",
};

function logTimestamp(log) {
  return new Date(log?.submittedAt || 0).getTime();
}

/** 제출값 그대로 보존 — trim/가공 없음 */
export function preserveRawSubmittedAnswer(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function normalizeIsCorrect(log) {
  if (log?.is_correct != null) return Boolean(log.is_correct);
  if (log?.isCorrect != null) return Boolean(log.isCorrect);
  return Boolean(log?.correct);
}

function normalizeAttemptId(log) {
  if (log?.attempt_id != null && String(log.attempt_id).length > 0) {
    return String(log.attempt_id);
  }
  const attemptNumber = Number(log?.attemptNumber ?? 1);
  const attemptType = String(log?.attemptType ?? ATTEMPT_TYPES.EXAM);
  return `${attemptNumber}-${attemptType}`;
}

export function createAttemptLogEntry({
  questionId,
  num,
  userAnswer,
  isCorrect,
  submittedAt,
  attemptNumber,
  attemptType = ATTEMPT_TYPES.EXAM,
  attemptId = null,
  resultId = null,
}) {
  const serialized = preserveRawSubmittedAnswer(userAnswer);
  const normalizedAttemptNumber = Number(attemptNumber) || 1;
  const resolvedAttemptId =
    attemptId ??
    (resultId
      ? `${resultId}-attempt-${normalizedAttemptNumber}-${attemptType}`
      : `attempt-${normalizedAttemptNumber}-${attemptType}`);

  return {
    attempt_id: resolvedAttemptId,
    questionId,
    num: num ?? null,
    userAnswer: serialized,
    studentAnswer: serialized,
    userResponse: serialized,
    is_correct: Boolean(isCorrect),
    isCorrect: Boolean(isCorrect),
    correct: Boolean(isCorrect),
    submittedAt: submittedAt ?? new Date().toISOString(),
    attemptNumber: normalizedAttemptNumber,
    attemptType,
  };
}

function readRawSubmittedAnswer(detail, meta) {
  const answersMap = meta?.answers ?? meta?.responses ?? {};
  const fromMap =
    detail?.questionId != null
      ? answersMap[detail.questionId] ?? answersMap[String(detail.questionId)]
      : undefined;

  return preserveRawSubmittedAnswer(
    detail?.userAnswer ??
      detail?.studentAnswer ??
      detail?.userResponse ??
      fromMap
  );
}

export function buildAttemptLogsFromDetails(details, meta) {
  return ensureArray(details).map((detail) =>
    createAttemptLogEntry({
      questionId: detail.questionId,
      num: detail.num,
      userAnswer: readRawSubmittedAnswer(detail, meta),
      isCorrect: detail.correct === true,
      submittedAt: meta.submittedAt,
      attemptNumber: meta.attemptNumber,
      attemptType: meta.attemptType,
      resultId: meta.id ?? meta.resultId ?? null,
    })
  );
}

export function buildTestAttemptRecord(result, attemptType) {
  const attemptNumber = Number(result?.attemptCount ?? 1);
  const submittedAt = result?.submittedAt ?? new Date().toISOString();
  const attempt_logs = buildAttemptLogsFromDetails(result?.details, {
    ...result,
    attemptNumber,
    attemptType,
    submittedAt,
  });

  const attempt_id = result?.id
    ? `${result.id}-attempt-${attemptNumber}-${attemptType}`
    : `attempt-${attemptNumber}-${attemptType}`;

  return {
    attempt_id,
    attemptNumber,
    submittedAt,
    attemptType,
    score: Number(result?.score ?? 0),
    total: Number(result?.total ?? 0),
    attempt_logs,
    answer_logs: attempt_logs,
  };
}

export function sortAttemptLogs(logs) {
  return [...ensureArray(logs)].sort((a, b) => {
    const attemptDiff = Number(a.attemptNumber ?? 0) - Number(b.attemptNumber ?? 0);
    if (attemptDiff !== 0) return attemptDiff;

    const idDiff = normalizeAttemptId(a).localeCompare(normalizeAttemptId(b), undefined, {
      numeric: true,
    });
    if (idDiff !== 0) return idDiff;

    return logTimestamp(a) - logTimestamp(b);
  });
}

/** attempt_logs 전용 — lastSubmission / details 폴백 없음 */
export function getAttemptLogs(result) {
  const logs = result?.attempt_logs ?? result?.answer_logs ?? [];
  return sortAttemptLogs(logs);
}

export function getTestAttempts(result) {
  return ensureArray(result?.test_attempts);
}

/** WHERE is_correct = false 고정 */
export function getWrongAttemptLogs(result) {
  return getAttemptLogs(result).filter((log) => normalizeIsCorrect(log) === false);
}

export function getWrongAttemptLogsForQuestion(result, questionId) {
  if (questionId == null) return [];

  return getWrongAttemptLogs(result).filter(
    (log) =>
      log.questionId === questionId || String(log.questionId) === String(questionId)
  );
}

export function formatAttemptLabel(log) {
  return formatSessionLabel({
    attemptNumber: log?.attemptNumber,
    attemptType: log?.attemptType,
  });
}

/** 관리자 상세 — [1차 응시], [재시험 1] 등 응시 단계 라벨 */
export function formatSessionLabel(attemptRecord, allAttempts = []) {
  const attemptType = attemptRecord?.attemptType ?? ATTEMPT_TYPES.EXAM;
  const attemptNumber = Number(attemptRecord?.attemptNumber ?? 1);

  if (attemptType === ATTEMPT_TYPES.CLINIC) {
    const clinicIndex = ensureArray(allAttempts).filter(
      (item) =>
        item?.attemptType === ATTEMPT_TYPES.CLINIC &&
        Number(item?.attemptNumber ?? 0) <= attemptNumber
    ).length;
    return clinicIndex > 0 ? `오답 노트 (${clinicIndex}회)` : "오답 노트";
  }

  if (attemptType === ATTEMPT_TYPES.RETEST || attemptNumber > 1) {
    return `재시험 ${Math.max(1, attemptNumber - 1)}`;
  }

  return "1차 응시";
}

export function sortTestAttempts(attempts) {
  return [...ensureArray(attempts)].sort((a, b) => {
    const numDiff = Number(a?.attemptNumber ?? 0) - Number(b?.attemptNumber ?? 0);
    if (numDiff !== 0) return numDiff;

    const idDiff = String(a?.attempt_id ?? "").localeCompare(String(b?.attempt_id ?? ""), undefined, {
      numeric: true,
    });
    if (idDiff !== 0) return idDiff;

    return logTimestamp({ submittedAt: a?.submittedAt }) - logTimestamp({ submittedAt: b?.submittedAt });
  });
}

/** 세션 스냅샷 — test_attempts.attempt_logs 원본만 (results.details 폴백 없음) */
export function getSessionAttemptLogs(session) {
  return sortAttemptLogs(session?.attempt_logs ?? session?.answer_logs ?? []);
}

function groupFlatLogsIntoSessions(logs) {
  const byAttemptId = new Map();

  sortAttemptLogs(logs).forEach((log) => {
    const attemptId = normalizeAttemptId(log);
    if (!byAttemptId.has(attemptId)) {
      byAttemptId.set(attemptId, {
        attempt_id: attemptId,
        attemptNumber: log.attemptNumber,
        attemptType: log.attemptType,
        submittedAt: log.submittedAt,
        attempt_logs: [],
      });
    }
    byAttemptId.get(attemptId).attempt_logs.push(log);
  });

  return sortTestAttempts([...byAttemptId.values()]);
}

/**
 * results 테이블과 분리된 test_attempts / attempt_logs 기준 응시 세션 목록
 * 각 세션의 답안은 해당 attempt_logs 스냅샷에서만 조회
 */
export function getResultAttemptSessions(result) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  const testAttempts = sortTestAttempts(getTestAttempts(synced));

  if (testAttempts.length > 0) {
    return testAttempts.map((attempt) => ({
      ...attempt,
      label: formatSessionLabel(attempt, testAttempts),
      logs: getSessionAttemptLogs(attempt),
    }));
  }

  const grouped = groupFlatLogsIntoSessions(getAttemptLogs(synced));
  return grouped.map((attempt) => ({
    ...attempt,
    label: formatSessionLabel(attempt, grouped),
    logs: getSessionAttemptLogs(attempt),
  }));
}

export function isAttemptLogCorrect(log) {
  return normalizeIsCorrect(log);
}

/** attempt_id / attemptNumber 기준 시점별 오답 목록 */
export function getWrongAnswersGroupedByAttempt(result, questionId) {
  return getWrongAttemptLogsForQuestion(result, questionId).map((log) => ({
    attemptId: normalizeAttemptId(log),
    attemptNumber: Number(log.attemptNumber ?? 1),
    attemptType: log.attemptType ?? ATTEMPT_TYPES.EXAM,
    label: formatAttemptLabel(log),
    userAnswer: log.userAnswer,
    submittedAt: log.submittedAt,
    isCorrect: false,
  }));
}

/** 1차 시험에서 틀린 답 (attempt_logs only) */
export function getFirstAttemptWrongAnswer(result, questionId) {
  const logs = getWrongAttemptLogsForQuestion(result, questionId).filter(
    (log) => Number(log.attemptNumber) === 1 && log.attemptType === ATTEMPT_TYPES.EXAM
  );
  if (logs.length > 0) return logs[0].userAnswer;

  const fallbackFirst = getWrongAttemptLogsForQuestion(result, questionId).find(
    (log) => Number(log.attemptNumber) === 1
  );
  return fallbackFirst?.userAnswer ?? null;
}

/** @deprecated lastSubmission 폴백 제거 — attempt_logs 오답 중 마지막 시점 */
export function getLatestWrongAnswerRaw(result, questionId) {
  const logs = getWrongAttemptLogsForQuestion(result, questionId);
  if (logs.length === 0) return null;
  return logs[logs.length - 1].userAnswer;
}

export function buildWrongAnswerHistoryForDetail(result, questionId) {
  return getWrongAnswersGroupedByAttempt(result, questionId);
}

function backfillLegacyAttemptLogs(result) {
  const existing = getAttemptLogs(result);
  if (existing.length > 0) {
    return {
      attempt_logs: existing,
      answer_logs: existing,
      test_attempts: getTestAttempts(result),
    };
  }

  const submittedAt = result?.submittedAt ?? new Date().toISOString();
  const attemptNumber = Number(result?.attemptCount ?? 1);
  const attemptType = attemptNumber > 1 ? ATTEMPT_TYPES.RETEST : ATTEMPT_TYPES.EXAM;

  const attempt_logs = buildAttemptLogsFromDetails(result?.details, {
    ...result,
    submittedAt,
    attemptNumber,
    attemptType,
  });

  const test_attempts = [buildTestAttemptRecord({ ...result, details: result?.details }, attemptType)];

  ensureArray(result?.details).forEach((detail) => {
    if (!detail?.examRetest) return;

    const firstWrong = preserveRawSubmittedAnswer(detail.examRetest.previousUserAnswer);
    if (!firstWrong) return;

    const alreadyHasFirst = attempt_logs.some(
      (log) =>
        log.questionId === detail.questionId &&
        normalizeIsCorrect(log) === false &&
        Number(log.attemptNumber) === 1
    );

    if (!alreadyHasFirst) {
      attempt_logs.push(
        createAttemptLogEntry({
          questionId: detail.questionId,
          num: detail.num,
          userAnswer: firstWrong,
          isCorrect: false,
          submittedAt: detail.examRetest.submittedAt ?? submittedAt,
          attemptNumber: 1,
          attemptType: ATTEMPT_TYPES.EXAM,
          resultId: result?.id ?? null,
        })
      );
    }
  });

  const sorted = sortAttemptLogs(attempt_logs);
  return {
    attempt_logs: sorted,
    answer_logs: sorted,
    test_attempts,
  };
}

export function appendTestAttemptToResult(previousResult, nextResult, attemptType) {
  const attemptRecord = buildTestAttemptRecord(nextResult, attemptType);
  const previousAttempts = getTestAttempts(previousResult);
  const previousLogs = previousResult ? getAttemptLogs(previousResult) : [];

  const test_attempts = [...previousAttempts, attemptRecord];
  const attempt_logs = sortAttemptLogs([
    ...previousLogs,
    ...ensureArray(attemptRecord.attempt_logs),
  ]);

  return {
    ...nextResult,
    test_attempts,
    attempt_logs,
    answer_logs: attempt_logs,
  };
}

export function syncWrongAnswerHistoryOnResult(result) {
  const { attempt_logs, test_attempts } = backfillLegacyAttemptLogs(result);

  const details = ensureArray(result?.details).map((detail) => {
    const wrongAnswerHistory = buildWrongAnswerHistoryForDetail(
      { ...result, attempt_logs },
      detail.questionId
    );

    return {
      ...detail,
      wrongAnswerHistory,
    };
  });

  return {
    ...result,
    details,
    attempt_logs,
    answer_logs: attempt_logs,
    test_attempts: test_attempts.length ? test_attempts : getTestAttempts(result),
  };
}

export function hasWrongAnswerHistory(result, questionId) {
  return getWrongAttemptLogsForQuestion(result, questionId).length > 0;
}

export function detailNeedsRetestReview(detail, result) {
  if (!detail) return false;
  return hasWrongAnswerHistory(result, detail.questionId);
}

export function getRetestReviewQuestionIds(result) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  const ids = new Set();

  getWrongAttemptLogs(synced)
    .filter((log) => Number(log.attemptNumber) === 1)
    .forEach((log) => ids.add(log.questionId));

  if (ids.size === 0) {
    getWrongAttemptLogs(synced).forEach((log) => ids.add(log.questionId));
  }

  return ids;
}

// Legacy aliases
export const createAnswerLogEntry = createAttemptLogEntry;
export const buildAnswerLogsFromDetails = buildAttemptLogsFromDetails;
export const getAnswerLogs = getAttemptLogs;
