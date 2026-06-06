import * as localStorageApi from "../utils/resultsStorage";
import {
  ExamSubmissionValidationError,
  stripAnswersFromResultRecord,
  validateResultSubmission,
} from "../utils/examSubmissionValidation";
import { ensureArray } from "../utils/safeData";

export { formatDate } from "../utils/resultsStorage";
export { ExamSubmissionValidationError } from "../utils/examSubmissionValidation";

export function isFirebaseReady() {
  return false;
}

export function getSyncMode() {
  return "local";
}

export async function fetchAllResults() {
  return ensureArray(localStorageApi.loadResults());
}

export async function replaceResult(resultId, record) {
  validateResultSubmission(record);

  const payload = {
    studentId: record.studentId,
    studentName: record.studentName,
    testId: record.testId,
    testTitle: record.testTitle,
    score: record.score,
    total: record.total,
    submittedAt: record.submittedAt ?? new Date().toISOString(),
    details: ensureArray(record.details),
    attemptCount: Number(record.attemptCount ?? 1),
    id: resultId,
    ...(record.clinicRetest ? { clinicRetest: record.clinicRetest } : {}),
  };

  localStorageApi.replaceResult(resultId, stripAnswersFromResultRecord(payload));
  return ensureArray(localStorageApi.loadResults());
}

export async function saveResult(record) {
  validateResultSubmission(record);

  const payload = {
    studentId: record.studentId,
    studentName: record.studentName,
    testId: record.testId,
    testTitle: record.testTitle,
    score: record.score,
    total: record.total,
    submittedAt: record.submittedAt,
    details: ensureArray(record.details),
    attemptCount: Number(record.attemptCount ?? 1),
    id: record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };

  localStorageApi.saveResult(stripAnswersFromResultRecord(payload));
  return ensureArray(localStorageApi.loadResults());
}

export async function deleteResult(resultId) {
  return ensureArray(localStorageApi.deleteResult(resultId));
}

export async function clearAllResults() {
  localStorageApi.clearResults();
  return [];
}
