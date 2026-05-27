import * as localStorageApi from "../utils/resultsStorage";

export { formatDate } from "../utils/resultsStorage";

export function isFirebaseReady() {
  return false;
}

export function getSyncMode() {
  return "local";
}

export async function fetchAllResults() {
  return localStorageApi.loadResults();
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
    details: record.details,
    id: record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  localStorageApi.saveResult(payload);
  return localStorageApi.loadResults();
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
