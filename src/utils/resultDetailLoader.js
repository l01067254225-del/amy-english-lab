import { getResultDateKey, getStudentResultsOnDate } from "./scoreAnalytics";
import {
  getAttemptLogs,
  getTestAttempts,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";
import { ensureArray } from "./safeData";

function readStudentId(result) {
  return result?.student_id ?? result?.studentId ?? result?.studentName ?? null;
}

function mergeAttemptLogsFromResults(results) {
  const seen = new Set();
  const merged = [];

  ensureArray(results).forEach((result) => {
    const synced = syncWrongAnswerHistoryOnResult(result);
    getAttemptLogs(synced).forEach((log) => {
      const key = [
        log.attempt_id ?? "",
        log.attempt_number ?? log.attemptNumber ?? "",
        log.questionId ?? log.question_id ?? "",
        log.num ?? "",
      ].join("|");

      if (seen.has(key)) return;
      seen.add(key);
      merged.push(log);
    });
  });

  return merged;
}

function mergeTestAttemptsFromResults(results) {
  const seen = new Set();
  const merged = [];

  ensureArray(results).forEach((result) => {
    const synced = syncWrongAnswerHistoryOnResult(result);
    getTestAttempts(synced).forEach((attempt) => {
      const key = attempt.attempt_id ?? `${attempt.attempt_number}-${attempt.submittedAt}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(attempt);
    });
  });

  return merged.sort(
    (a, b) => Number(a.attempt_number ?? a.attemptNumber ?? 0) - Number(b.attempt_number ?? b.attemptNumber ?? 0)
  );
}

/**
 * student_id + date 복합 키로 해당 날짜 응시 기록을 모아 attempt_logs 병합
 */
export function resolveResultByStudentAndDate(allResults, { studentId, studentName, submittedAt, resultId }) {
  const dateKey = getResultDateKey(submittedAt);
  const studentKey = studentId ?? studentName;

  let dayResults = getStudentResultsOnDate(allResults, studentKey, studentName, dateKey);

  if (dayResults.length === 0 && resultId) {
    const byId = ensureArray(allResults).find((item) => item.id === resultId);
    if (byId) dayResults = [byId];
  }

  if (dayResults.length === 0) {
    return null;
  }

  const primary =
    dayResults.find((item) => item.id === resultId) ??
    dayResults.find((item) => item.submittedAt === submittedAt) ??
    [...dayResults].sort(
      (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    )[0];

  const mergedAttemptLogs = mergeAttemptLogsFromResults(dayResults);
  const mergedTestAttempts = mergeTestAttemptsFromResults(dayResults);

  return syncWrongAnswerHistoryOnResult({
    ...primary,
    student_id: readStudentId(primary),
    studentId: readStudentId(primary),
    attempt_logs: mergedAttemptLogs.length ? mergedAttemptLogs : primary.attempt_logs,
    answer_logs: mergedAttemptLogs.length ? mergedAttemptLogs : primary.answer_logs,
    test_attempts: mergedTestAttempts.length ? mergedTestAttempts : primary.test_attempts,
    _detailLoadMeta: {
      lookupKey: `${studentKey}@${dateKey}`,
      dateKey,
      studentId: studentKey,
      sourceResultIds: dayResults.map((item) => item.id),
      mergedAttemptLogCount: mergedAttemptLogs.length,
    },
  });
}

/** 답안 없을 때 원장님 확인용 attempt_logs 전체 출력 */
export function debugLogAttemptLogsIfEmpty(result, detailView) {
  if (!result || detailView?.isReady) return;

  const synced = syncWrongAnswerHistoryOnResult(result);
  const meta = result._detailLoadMeta ?? {};

  console.group("[Amy-Test] attempt_logs 디버그 — 답안 데이터 없음");
  console.log("student_id:", result.studentId ?? result.student_id);
  console.log("student_name:", result.studentName);
  console.log("date:", meta.dateKey ?? getResultDateKey(result.submittedAt));
  console.log("lookup_key:", meta.lookupKey ?? "(미설정)");
  console.log("result_id:", result.id);
  console.log("test_id (참고):", result.testId);
  console.log("병합된 result_ids:", meta.sourceResultIds ?? [result.id]);
  console.log("attempt_logs 전체:", getAttemptLogs(synced));
  console.log("test_attempts 전체:", getTestAttempts(synced));
  console.log("details:", synced.details);
  console.log("answers:", synced.answers ?? synced.responses);
  console.groupEnd();
}

export { getResultDateKey };
