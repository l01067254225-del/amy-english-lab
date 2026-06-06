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
    user_answer: serialized,
    studentAnswer: serialized,
    userResponse: serialized,
    is_correct: Boolean(isCorrect),
    isCorrect: Boolean(isCorrect),
    correct: Boolean(isCorrect),
    submittedAt: submittedAt ?? new Date().toISOString(),
    submitted_at: submittedAt ?? new Date().toISOString(),
    attemptNumber: normalizedAttemptNumber,
    attempt_number: normalizedAttemptNumber,
    attemptType,
    attempt_type: attemptType,
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
    attempt_number: attemptNumber,
    submittedAt,
    submitted_at: submittedAt,
    attemptType,
    attempt_type: attemptType,
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

export function getWrongAttemptLogsForQuestion(result, questionId, num = null) {
  if (questionId == null && num == null) return [];

  return getWrongAttemptLogs(result).filter((log) =>
    matchAttemptLogToQuestion(log, { questionId, num })
  );
}

export function formatAttemptLabel(log) {
  return formatSessionLabel({
    attemptNumber: log?.attemptNumber,
    attemptType: log?.attemptType,
  });
}

/** 관리자 상세 — [1차 답안], [재시 1차 답안] 등 컬럼 라벨 */
export function formatAttemptColumnLabel(attemptRecord, allAttempts = []) {
  const attemptType = attemptRecord?.attempt_type ?? attemptRecord?.attemptType ?? ATTEMPT_TYPES.EXAM;
  const attemptNumber = Number(attemptRecord?.attempt_number ?? attemptRecord?.attemptNumber ?? 1);

  if (attemptType === ATTEMPT_TYPES.CLINIC) {
    const clinicIndex = ensureArray(allAttempts).filter(
      (item) =>
        (item?.attempt_type ?? item?.attemptType) === ATTEMPT_TYPES.CLINIC &&
        Number(item?.attempt_number ?? item?.attemptNumber ?? 0) <= attemptNumber
    ).length;
    return clinicIndex > 0 ? `오답 노트 (${clinicIndex}회)` : "오답 노트";
  }

  if (attemptNumber === 1) {
    return "1차 답안";
  }

  return `재시 ${attemptNumber - 1}차 답안`;
}

/** 관리자 상세 — [1차 응시], [재시험 1] 등 응시 단계 라벨 */
export function formatSessionLabel(attemptRecord, allAttempts = []) {
  return formatAttemptColumnLabel(attemptRecord, allAttempts).replace(" 답안", "");
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

function readRawUserAnswerFromLog(log) {
  return preserveRawSubmittedAnswer(
    log?.user_answer ?? log?.userAnswer ?? log?.studentAnswer ?? log?.userResponse
  );
}

export function isUserAnswerPresent(value) {
  return value !== null && value !== undefined;
}

/** questionId 또는 num(Q1~Q10) 기준 attempt_log 매칭 */
export function matchAttemptLogToQuestion(log, { questionId, num } = {}) {
  if (!log) return false;

  const qKey = questionId != null ? String(questionId) : null;
  const questionNum = num != null ? Number(num) : null;
  const logQuestionId = log.question_id ?? log.questionId;
  const logNum = log.num != null ? Number(log.num) : null;

  if (qKey && logQuestionId != null && String(logQuestionId) === qKey) return true;
  if (questionNum != null && logNum != null && logNum === questionNum) return true;

  return false;
}

export function findAttemptLogForQuestion(logs, { questionId, num } = {}) {
  return ensureArray(logs).find((log) => matchAttemptLogToQuestion(log, { questionId, num })) ?? null;
}

export function getAttemptLogsForNumber(result, attemptNumber) {
  return getAttemptLogs(result).filter(
    (log) => Number(log.attempt_number ?? log.attemptNumber ?? 1) === Number(attemptNumber)
  );
}

function findDetailForQuestion(result, { questionId, num } = {}) {
  return (
    ensureArray(result?.details).find((detail) => matchAttemptLogToQuestion(detail, { questionId, num })) ??
    null
  );
}

function readSubmissionFromAnswersMap(result, questionId) {
  const map = result?.answers ?? result?.responses ?? {};
  if (!map || typeof map !== "object") return null;

  if (questionId == null) return null;

  if (map[questionId] !== undefined) return preserveRawSubmittedAnswer(map[questionId]);
  if (map[String(questionId)] !== undefined) return preserveRawSubmittedAnswer(map[String(questionId)]);

  return null;
}

/**
 * attempt_logs(응시) + details(채점) join — questionId/num 기준
 * @returns {{ status: 'found'|'missing', user_answer: string|null, is_correct: boolean|null, source: string|null, attemptNumber: number, fallbackFrom?: number }}
 */
export function resolveJoinedAttemptAnswer(result, attemptNumber, { questionId, num } = {}) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  const normalizedAttempt = Number(attemptNumber) || 1;

  const historySession =
    buildAttemptHistoryFromResult(synced).find(
      (item) => Number(item.attempt_number) === normalizedAttempt
    ) ?? null;

  if (historySession) {
    const record =
      findAttemptLogForQuestion(historySession.records, { questionId, num }) ??
      historySession.records.find((item) => matchAttemptLogToQuestion(item, { questionId, num }));

    if (record) {
      const user_answer = preserveRawSubmittedAnswer(record.user_answer);
      return {
        status: "found",
        user_answer,
        is_correct: record.is_correct ?? null,
        source: "attempt_history",
        attemptNumber: normalizedAttempt,
      };
    }
  }

  const testAttempt = sortTestAttempts(getTestAttempts(synced)).find(
    (item) => Number(item.attempt_number ?? item.attemptNumber) === normalizedAttempt
  );
  if (testAttempt) {
    const log = findAttemptLogForQuestion(getSessionAttemptLogs(testAttempt), { questionId, num });
    if (log) {
      return {
        status: "found",
        user_answer: readRawUserAnswerFromLog(log),
        is_correct: normalizeIsCorrect(log),
        source: "test_attempts",
        attemptNumber: normalizedAttempt,
      };
    }
  }

  const flatLog = findAttemptLogForQuestion(getAttemptLogsForNumber(synced, normalizedAttempt), {
    questionId,
    num,
  });
  if (flatLog) {
    return {
      status: "found",
      user_answer: readRawUserAnswerFromLog(flatLog),
      is_correct: normalizeIsCorrect(flatLog),
      source: "attempt_logs",
      attemptNumber: normalizedAttempt,
    };
  }

  const detail = findDetailForQuestion(synced, { questionId, num });
  const gradingCorrect = detail?.correct === true ? true : detail?.correct === false ? false : null;

  if (normalizedAttempt === 1 && detail?.examRetest?.previousUserAnswer != null) {
    return {
      status: "found",
      user_answer: preserveRawSubmittedAnswer(detail.examRetest.previousUserAnswer),
      is_correct: false,
      source: "exam_retest_join",
      attemptNumber: normalizedAttempt,
    };
  }

  if (normalizedAttempt === 1) {
    const fromMap = readSubmissionFromAnswersMap(synced, questionId);
    if (isUserAnswerPresent(fromMap)) {
      return {
        status: "found",
        user_answer: fromMap,
        is_correct: gradingCorrect,
        source: "answers_join",
        attemptNumber: normalizedAttempt,
      };
    }
  }

  if (detail) {
    const fromDetail =
      detail.userAnswer ?? detail.studentAnswer ?? detail.userResponse ?? null;
    if (isUserAnswerPresent(fromDetail) && normalizedAttempt === Number(synced.attemptCount ?? 1)) {
      return {
        status: "found",
        user_answer: preserveRawSubmittedAnswer(fromDetail),
        is_correct: gradingCorrect,
        source: "details_join",
        attemptNumber: normalizedAttempt,
      };
    }
  }

  return {
    status: "missing",
    user_answer: null,
    is_correct: gradingCorrect,
    source: null,
    attemptNumber: normalizedAttempt,
  };
}

/** attempt_number=1 우선, 없으면 다음 회차 순회 */
export function resolveJoinedAttemptAnswerWithFallback(result, { questionId, num, startAttemptNumber = 1 } = {}) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  const attemptNumbers = [
    ...new Set(
      getExamAttemptHistory(synced)
        .map((item) => Number(item.attempt_number))
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b)
    ),
  ];

  if (attemptNumbers.length === 0) {
    attemptNumbers.push(Number(startAttemptNumber) || 1);
  }

  const ordered = [
    Number(startAttemptNumber) || 1,
    ...attemptNumbers.filter((value) => value !== (Number(startAttemptNumber) || 1)),
  ];

  for (const attemptNumber of ordered) {
    const resolved = resolveJoinedAttemptAnswer(synced, attemptNumber, { questionId, num });
    if (resolved.status === "found") {
      return {
        ...resolved,
        fallbackFrom: attemptNumber !== (Number(startAttemptNumber) || 1) ? attemptNumber : null,
      };
    }
  }

  return {
    status: "missing",
    user_answer: null,
    is_correct: null,
    source: null,
    attemptNumber: Number(startAttemptNumber) || 1,
    fallbackFrom: null,
  };
}

/** attempt_history 테이블 레코드 정규화 (test_attempts → attempt_history) */
export function normalizeAttemptHistoryRecord(session) {
  const attempt_number = Number(session?.attempt_number ?? session?.attemptNumber ?? 1);
  const attempt_type = session?.attempt_type ?? session?.attemptType ?? ATTEMPT_TYPES.EXAM;
  const logs = getSessionAttemptLogs(session);

  return {
    attempt_id: session?.attempt_id ?? null,
    attempt_number,
    attempt_type,
    submitted_at: session?.submitted_at ?? session?.submittedAt ?? null,
    score: session?.score ?? null,
    total: session?.total ?? null,
    records: logs.map((log) => ({
      question_id: log.questionId ?? log.question_id ?? null,
      questionId: log.questionId ?? log.question_id ?? null,
      num: log.num ?? null,
      user_answer: readRawUserAnswerFromLog(log),
      is_correct: normalizeIsCorrect(log),
      submitted_at: log.submitted_at ?? log.submittedAt ?? null,
    })),
  };
}

function buildAttemptHistoryFromResult(result) {
  const testAttempts = sortTestAttempts(getTestAttempts(result));
  if (testAttempts.length > 0) {
    return testAttempts.map(normalizeAttemptHistoryRecord);
  }

  return groupFlatLogsIntoSessions(getAttemptLogs(result)).map(normalizeAttemptHistoryRecord);
}

/**
 * attempt_history 테이블 조회 — 항상 attempt_logs/test_attempts에서 재구성
 */
export function getAttemptHistory(result) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  return buildAttemptHistoryFromResult(synced);
}

/** attempt_number + question_id/num으로 user_answer 1:1 조회 */
export function getUserAnswerAtAttempt(result, attemptNumber, questionId, num = null) {
  const resolved = resolveJoinedAttemptAnswer(result, attemptNumber, { questionId, num });
  return resolved.status === "found" ? resolved.user_answer : null;
}

/** 시험/재시험 회차만 (관리자 상세용) */
export function getExamAttemptHistory(result) {
  return getAttemptHistory(result).filter(
    (item) => item.attempt_type !== ATTEMPT_TYPES.CLINIC
  );
}

export function syncAttemptHistoryOnResult(result) {
  const attempt_history = buildAttemptHistoryFromResult(result);
  return {
    ...result,
    attempt_history,
  };
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
  if (logs.length > 0) return readRawUserAnswerFromLog(logs[0]);

  const fallbackFirst = getWrongAttemptLogsForQuestion(result, questionId).find(
    (log) => Number(log.attemptNumber ?? log.attempt_number) === 1
  );
  return fallbackFirst ? readRawUserAnswerFromLog(fallbackFirst) : null;
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
    const test_attempts = getTestAttempts(result);
    return {
      attempt_logs: existing,
      answer_logs: existing,
      test_attempts,
      attempt_history: test_attempts.length
        ? test_attempts.map(normalizeAttemptHistoryRecord)
        : buildAttemptHistoryFromResult({ ...result, attempt_logs: existing }),
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
  const rebuiltAttempts = [buildTestAttemptRecord({ ...result, details: result?.details }, attemptType)];
  return {
    attempt_logs: sorted,
    answer_logs: sorted,
    test_attempts: rebuiltAttempts,
    attempt_history: rebuiltAttempts.map(normalizeAttemptHistoryRecord),
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
  const attempt_history = test_attempts.map(normalizeAttemptHistoryRecord);

  return {
    ...nextResult,
    test_attempts,
    attempt_logs,
    answer_logs: attempt_logs,
    attempt_history,
  };
}

export function syncWrongAnswerHistoryOnResult(result) {
  const { attempt_logs, test_attempts, attempt_history } = backfillLegacyAttemptLogs(result);

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
    attempt_history: attempt_history ?? buildAttemptHistoryFromResult({ ...result, attempt_logs, test_attempts }),
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
