import * as localStorageApi from "../utils/resultsStorage";
import { ensureArray } from "../utils/safeData";

export { formatDate } from "../utils/resultsStorage";

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
  };
  localStorageApi.replaceResult(resultId, payload);
  return ensureArray(localStorageApi.loadResults());
}

export async function saveResult(record) {
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
  localStorageApi.saveResult(payload);
  return ensureArray(localStorageApi.loadResults());
}

export async function deleteResult(resultId) {
  const remaining = localStorageApi.loadResults().filter((item) => item.id !== resultId);
  localStorage.setItem(localStorageApi.STORAGE_KEY, JSON.stringify(remaining));
  return remaining;
}

export async function clearAllResults() {
  localStorageApi.clearResults();
  return [];
}
