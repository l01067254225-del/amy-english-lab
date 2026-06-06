import { gradeQuestion } from "./grade";
import { replaceResult } from "./resultsStorage";
import { ensureArray } from "./safeData";

export function isClinicRetestCompleted(result) {
  return Boolean(result?.clinicRetest?.completed);
}

export function buildClinicRetestPayload(items, answers) {
  const retestItems = ensureArray(items).map((item) => {
    const userAnswer = String(answers[item.question.id] ?? "").trim();
    const correct = gradeQuestion(item.question, userAnswer) === 1;
    return {
      num: item.num,
      questionId: item.question.id,
      userAnswer,
      correct,
    };
  });

  const correctCount = retestItems.filter((entry) => entry.correct).length;

  return {
    completed: true,
    submittedAt: new Date().toISOString(),
    correctCount,
    totalCount: retestItems.length,
    items: retestItems,
  };
}

export function applyClinicRetestToResult(result, clinicRetest) {
  const retestByQuestionId = new Map(
    ensureArray(clinicRetest?.items).map((item) => [item.questionId, item])
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
        submittedAt: clinicRetest.submittedAt,
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
  const clinicRetest = buildClinicRetestPayload(items, answers);
  const updated = applyClinicRetestToResult(result, clinicRetest);
  replaceResult(result.id, updated);
  return updated;
}

export function getClinicRetestSummary(result) {
  if (!isClinicRetestCompleted(result)) return null;
  return {
    correctCount: Number(result.clinicRetest.correctCount ?? 0),
    totalCount: Number(result.clinicRetest.totalCount ?? 0),
    submittedAt: result.clinicRetest.submittedAt,
  };
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
