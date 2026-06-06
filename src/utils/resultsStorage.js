import { enrichResultRecordForSave, normalizeStoredResults, resultsNeedAnswerMigration } from "./resultAnswerStorage";

export const STORAGE_KEY = "amy-test-results";
export const RESULTS_CACHE_BUSTER_KEY = "amy-test-results-cache-buster";

export function readRawResultsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadResults({ writeBack = true } = {}) {
  const raw = readRawResultsFromStorage();
  const normalized = normalizeStoredResults(raw);

  if (writeBack && resultsNeedAnswerMigration(raw, normalized)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(RESULTS_CACHE_BUSTER_KEY, String(Date.now()));
  }

  return normalized;
}

export function saveResult(record) {
  const prepared = enrichResultRecordForSave(record);
  const results = loadResults({ writeBack: false });
  const next = [prepared, ...results.filter((item) => item.id !== prepared.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  localStorage.setItem(RESULTS_CACHE_BUSTER_KEY, String(Date.now()));
  return next;
}

export function clearResults() {
  localStorage.removeItem(STORAGE_KEY);
}

export function replaceResult(resultId, record) {
  const prepared = enrichResultRecordForSave({ ...record, id: resultId });
  const results = loadResults({ writeBack: false });
  const index = results.findIndex((item) => item.id === resultId);

  if (index < 0) {
    const next = [prepared, ...results];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(RESULTS_CACHE_BUSTER_KEY, String(Date.now()));
    return next;
  }

  const next = [...results];
  next[index] = prepared;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  localStorage.setItem(RESULTS_CACHE_BUSTER_KEY, String(Date.now()));
  return next;
}

export function deleteResult(resultId) {
  const results = loadResults();
  const next = results.filter((item) => item.id !== resultId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function formatDate(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
