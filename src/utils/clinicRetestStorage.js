import { gradeQuestion } from "./grade";
import { replaceResult } from "./resultsStorage";
import { ensureArray } from "./safeData";
import { completeIncorrectNotes } from "../services/pointsApi";
import {
  appendTestAttemptToResult,
  ATTEMPT_TYPES,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";

export const CLINIC_RETEST_MAX_ATTEMPTS = 3;

function buildLegacyAttempt(clinicRetest) {
  return {
    submittedAt: clinicRetest.submittedAt,
    correctCount: clinicRetest.correctCount,
    totalCount: clinicRetest.totalCount,
    items: ensureArray(clinicRetest.items),
  };
}

export function normalizeClinicRetestMeta(clinicRetest) {
  if (!clinicRetest) {
    return {
      attemptCount: 0,
      maxAttempts: CLINIC_RETEST_MAX_ATTEMPTS,
      attempts: [],
      latestAttempt: null,
    };
  }

  if (clinicRetest.attemptCount != null) {
    const attempts = ensureArray(clinicRetest.attempts);
    return {
      attemptCount: Number(clinicRetest.attemptCount) || 0,
      maxAttempts: Number(clinicRetest.maxAttempts) || CLINIC_RETEST_MAX_ATTEMPTS,
      attempts,
      latestAttempt:
        clinicRetest.latestAttempt ??
        attempts[attempts.length - 1] ??
        null,
    };
  }

  if (clinicRetest.completed || ensureArray(clinicRetest.items).length > 0) {
    const legacyAttempt = buildLegacyAttempt(clinicRetest);
    return {
      attemptCount: 1,
      maxAttempts: CLINIC_RETEST_MAX_ATTEMPTS,
      attempts: [legacyAttempt],
      latestAttempt: legacyAttempt,
    };
  }

  return {
    attemptCount: 0,
    maxAttempts: CLINIC_RETEST_MAX_ATTEMPTS,
    attempts: [],
    latestAttempt: null,
  };
}

export function getClinicRetestAttemptCount(result) {
  return normalizeClinicRetestMeta(result?.clinicRetest).attemptCount;
}

export function getClinicRetestRemainingAttempts(result) {
  const meta = normalizeClinicRetestMeta(result?.clinicRetest);
  return Math.max(0, meta.maxAttempts - meta.attemptCount);
}

export function getLatestClinicAttempt(result) {
  return normalizeClinicRetestMeta(result?.clinicRetest).latestAttempt;
}

export function hasClinicRetestWrongAnswers(result) {
  const latest = getLatestClinicAttempt(result);
  if (!latest) return true;
  return ensureArray(latest.items).some((item) => !item.correct);
}

export function isClinicRetestAllCorrect(result) {
  const latest = getLatestClinicAttempt(result);
  if (!latest) return false;
  const items = ensureArray(latest.items);
  return items.length > 0 && items.every((item) => item.correct);
}

export function canClinicRetest(result) {
  if (!result) return false;

  const meta = normalizeClinicRetestMeta(result.clinicRetest);
  if (meta.maxAttempts - meta.attemptCount <= 0) return false;

  if (meta.attemptCount === 0) {
    return ensureArray(result.details).some((detail) => !detail.correct);
  }

  return hasClinicRetestWrongAnswers(result);
}

export function isClinicRetestCompleted(result) {
  const meta = normalizeClinicRetestMeta(result?.clinicRetest);
  if (meta.attemptCount === 0) return false;
  return !canClinicRetest(result);
}

export function buildClinicRetestAttemptPayload(items, answers) {
  const retestItems = ensureArray(items).map((item) => {
    const userAnswer = String(answers[item.question.id] ?? "").trim();
    const correct = gradeQuestion(item.question, userAnswer) === 1;
    return {
      num: item.num,
      questionId: item.question.id,
      userAnswer,
      studentAnswer: userAnswer,
      userResponse: userAnswer,
      correct,
    };
  });

  const correctCount = retestItems.filter((entry) => entry.correct).length;

  return {
    submittedAt: new Date().toISOString(),
    correctCount,
    totalCount: retestItems.length,
    items: retestItems,
  };
}

export function applyClinicRetestToResult(result, clinicRetest, latestAttempt) {
  const attempt = latestAttempt ?? getLatestClinicAttempt({ clinicRetest });
  const retestByQuestionId = new Map(
    ensureArray(attempt?.items).map((item) => [item.questionId, item])
  );

  const details = ensureArray(result?.details).map((detail) => {
    const retestItem = retestByQuestionId.get(detail.questionId);
    if (!retestItem) return detail;

    return {
      ...detail,
      retested: true,
      clinicRetest: {
        correct: retestItem.correct,
        userAnswer: retestItem.userAnswer,
        studentAnswer: retestItem.studentAnswer ?? retestItem.userAnswer,
        userResponse: retestItem.userResponse ?? retestItem.userAnswer,
        submittedAt: attempt.submittedAt,
        attemptNumber: clinicRetest.attemptCount,
      },
    };
  });

  return {
    ...result,
    details,
    clinicRetest,
  };
}

export function saveClinicRetestResult(result, items, answers) {
  const latestAttempt = buildClinicRetestAttemptPayload(items, answers);
  const previous = normalizeClinicRetestMeta(result.clinicRetest);
  const attemptCount = previous.attemptCount + 1;
  const attempts = [...previous.attempts, latestAttempt];

  const clinicRetest = {
    attemptCount,
    maxAttempts: previous.maxAttempts,
    attempts,
    latestAttempt,
    submittedAt: latestAttempt.submittedAt,
    correctCount: latestAttempt.correctCount,
    totalCount: latestAttempt.totalCount,
    items: latestAttempt.items,
    completed: isClinicRetestCompleted({
      clinicRetest: {
        attemptCount,
        maxAttempts: previous.maxAttempts,
        attempts,
        latestAttempt,
      },
    }),
  };

  const updated = applyClinicRetestToResult(result, clinicRetest, latestAttempt);
  const clinicRecord = {
    ...updated,
    submittedAt: latestAttempt.submittedAt,
    attemptCount: Number(updated.attemptCount ?? 1),
  };

  const persisted = syncWrongAnswerHistoryOnResult(
    appendTestAttemptToResult(updated, clinicRecord, ATTEMPT_TYPES.CLINIC)
  );

  replaceResult(result.id, persisted);

  if (isClinicRetestAllCorrect(persisted)) {
    void completeIncorrectNotes(persisted);
  }

  return persisted;
}

export function getClinicRetestSummary(result) {
  const meta = normalizeClinicRetestMeta(result?.clinicRetest);
  if (meta.attemptCount === 0) return null;

  const latest = meta.latestAttempt;
  return {
    correctCount: Number(latest?.correctCount ?? 0),
    totalCount: Number(latest?.totalCount ?? 0),
    submittedAt: latest?.submittedAt ?? null,
    attemptCount: meta.attemptCount,
    maxAttempts: meta.maxAttempts,
    remainingAttempts: Math.max(0, meta.maxAttempts - meta.attemptCount),
    allCorrect: isClinicRetestAllCorrect(result),
  };
}

export function getClinicRetestButtonLabel(result, incorrectCount) {
  const remaining = getClinicRetestRemainingAttempts(result);
  const attemptCount = getClinicRetestAttemptCount(result);

  if (attemptCount > 0) {
    return `다시 풀기 (남은 횟수: ${remaining}회)`;
  }

  return `오답 노트 온라인 재응시 (${incorrectCount}문항 · 남은 횟수: ${remaining}회)`;
}

export function enrichIncorrectItemsWithClinic(result, items) {
  const detailByQuestionId = new Map(
    ensureArray(result?.details)
      .filter((detail) => detail?.questionId)
      .map((detail) => [detail.questionId, detail])
  );

  return ensureArray(items).map((item) => {
    const detail = detailByQuestionId.get(item.question.id);
    return {
      ...item,
      retested: Boolean(detail?.retested),
      clinicRetest: detail?.clinicRetest ?? null,
    };
  });
}
