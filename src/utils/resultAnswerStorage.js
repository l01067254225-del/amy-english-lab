import { isAnswerProvided } from "./examSubmissionValidation";
import { ensureArray } from "./safeData";

export function isAnswerEmpty(value) {
  return !isAnswerProvided(value);
}

function readAnswersMap(record) {
  const map = record?.answers ?? record?.responses ?? {};
  return map && typeof map === "object" ? map : {};
}

export function resolveDetailStudentAnswer(detail, result) {
  if (!detail) return "";

  const answersMap = readAnswersMap(result);
  const questionId = detail.questionId;

  const candidates = [
    detail.userAnswer,
    detail.studentAnswer,
    questionId != null ? answersMap[questionId] : undefined,
    questionId != null ? answersMap[String(questionId)] : undefined,
  ];

  for (const candidate of candidates) {
    if (!isAnswerEmpty(candidate)) {
      return String(candidate).trim();
    }
  }

  return "";
}

export function enrichResultRecordForSave(record) {
  if (!record || typeof record !== "object") return record;

  const answersMap = readAnswersMap(record);
  const details = ensureArray(record.details).map((detail) => {
    const resolved = resolveDetailStudentAnswer(detail, {
      ...record,
      answers: answersMap,
    });

    return {
      ...detail,
      userAnswer: resolved,
      studentAnswer: resolved,
    };
  });

  const normalizedAnswers = { ...answersMap };
  details.forEach((detail) => {
    if (detail.questionId == null || isAnswerEmpty(detail.userAnswer)) return;
    normalizedAnswers[detail.questionId] = detail.userAnswer;
  });

  return {
    ...record,
    details,
    answers: normalizedAnswers,
    responses: normalizedAnswers,
  };
}

export function normalizeStoredResult(record) {
  return enrichResultRecordForSave(record);
}

export function normalizeStoredResults(results) {
  return ensureArray(results).map(normalizeStoredResult);
}
