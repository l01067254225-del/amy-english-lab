import { isAnswerProvided } from "./examSubmissionValidation";
import {
  resolveFirstExamAnswer,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";
import { ensureArray } from "./safeData";

/** 제출 유효성: 빈 문자열도 미입력 */
export function isAnswerEmpty(value) {
  return !isAnswerProvided(value);
}

/** UI 표시: null / undefined 만 미입력 */
export function isAnswerMissingForDisplay(value) {
  return value === null || value === undefined;
}

export function coalesceStudentAnswer(...candidates) {
  for (const candidate of candidates) {
    if (!isAnswerMissingForDisplay(candidate)) {
      return typeof candidate === "string" ? candidate : String(candidate);
    }
  }
  return null;
}

function readAnswersMap(record) {
  const map =
    record?.answers ??
    record?.responses ??
    record?.userResponses ??
    record?.studentAnswers ??
    {};
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

function readResponseListEntry(result, questionId) {
  const lists = [
    result?.responseList,
    result?.responseDetails,
    result?.userResponseList,
    result?.studentResponses,
  ];

  for (const list of lists) {
    const entry = ensureArray(list).find(
      (item) =>
        item?.questionId === questionId ||
        String(item?.questionId) === String(questionId)
    );
    if (!entry) continue;

    const value = coalesceStudentAnswer(
      entry.studentAnswer,
      entry.userResponse,
      entry.userAnswer,
      entry.response,
      entry.studentResponse,
      entry.answer
    );
    if (value != null) return value;
  }

  return null;
}

function readDetailDirectFields(detail, { preferOriginal = false } = {}) {
  if (preferOriginal) {
    return coalesceStudentAnswer(
      detail?.firstSubmissionUserAnswer,
      detail?.examRetest?.previousUserAnswer
    );
  }

  return coalesceStudentAnswer(
    detail?.userAnswer,
    detail?.studentAnswer,
    detail?.userResponse,
    detail?.studentResponse,
    detail?.response,
    detail?.examRetest?.previousUserAnswer,
    detail?.examRetest?.userAnswer,
    detail?.examRetest?.studentAnswer,
    detail?.examRetest?.userResponse,
    detail?.clinicRetest?.userAnswer,
    detail?.clinicRetest?.studentAnswer,
    detail?.clinicRetest?.userResponse
  );
}

/** 재시험·클리닉 이후에도 1차 제출 답안 */
export function resolveOriginalStudentAnswer(detail, result) {
  if (!detail) return null;

  const resolved = resolveFirstExamAnswer(result, {
    questionId: detail.questionId,
    num: detail.num,
  });
  if (resolved.status === "found") {
    return resolved.user_answer;
  }

  const fromDetail = readDetailDirectFields(detail, { preferOriginal: true });
  if (fromDetail != null) return fromDetail;

  return null;
}

export function resolveDetailStudentAnswer(detail, result) {
  if (!detail) return null;

  const answersMap = readAnswersMap(result);
  const questionId = detail.questionId;

  const fromDetail = readDetailDirectFields(detail);
  if (fromDetail != null) return fromDetail;

  if (questionId != null) {
    const fromMap = coalesceStudentAnswer(
      answersMap[questionId],
      answersMap[String(questionId)]
    );
    if (fromMap != null) return fromMap;

    const fromList = readResponseListEntry(result, questionId);
    if (fromList != null) return fromList;
  }

  return null;
}

export function serializeSubmittedAnswer(value) {
  if (isAnswerMissingForDisplay(value)) return "";
  return String(value);
}

export function attachStudentAnswerFields(detail, rawAnswer) {
  const serialized = serializeSubmittedAnswer(rawAnswer);
  return {
    ...detail,
    userAnswer: serialized,
    studentAnswer: serialized,
    userResponse: serialized,
  };
}

export function enrichResultRecordForSave(record) {
  if (!record || typeof record !== "object") return record;

  const answersMap = readAnswersMap(record);
  const details = ensureArray(record.details).map((detail) => {
    const resolved = resolveDetailStudentAnswer(detail, {
      ...record,
      answers: answersMap,
    });

    const attached = attachStudentAnswerFields(detail, resolved ?? "");
    const preservedFirst =
      detail?.firstSubmissionUserAnswer ??
      detail?.examRetest?.previousUserAnswer ??
      (Number(record.attemptCount ?? 1) === 1 ? attached.userAnswer : null);

    return {
      ...attached,
      ...(preservedFirst != null
        ? { firstSubmissionUserAnswer: String(preservedFirst) }
        : {}),
    };
  });

  const normalizedAnswers = { ...answersMap };
  details.forEach((detail) => {
    if (detail.questionId == null || isAnswerMissingForDisplay(detail.userAnswer)) {
      return;
    }
    normalizedAnswers[detail.questionId] = detail.userAnswer;
    normalizedAnswers[String(detail.questionId)] = detail.userAnswer;
  });

  return syncWrongAnswerHistoryOnResult({
    ...record,
    details,
    answers: normalizedAnswers,
    responses: normalizedAnswers,
    userResponses: normalizedAnswers,
    studentAnswers: normalizedAnswers,
    scheduledTestDate: String(record.scheduledTestDate ?? "").trim(),
    endDate: String(record.endDate ?? "").trim(),
    submissionStatus: String(record.submissionStatus ?? "regular").trim() || "regular",
    isReview: Boolean(record.isReview),
    isLateSubmission: Boolean(record.isLateSubmission),
  });
}

export function normalizeStoredResult(record) {
  return enrichResultRecordForSave(record);
}

export function normalizeStoredResults(results) {
  return ensureArray(results).map(normalizeStoredResult);
}

export function resultsNeedAnswerMigration(before, after) {
  try {
    return JSON.stringify(before) !== JSON.stringify(after);
  } catch {
    return true;
  }
}
