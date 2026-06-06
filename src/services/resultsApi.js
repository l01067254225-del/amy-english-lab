import * as localStorageApi from "../utils/resultsStorage";
import { enrichResultRecordForSave } from "../utils/resultAnswerStorage";
import {
  ExamSubmissionValidationError,
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

export async function fetchAllResults({ cache = "no-store" } = {}) {
  void cache;
  localStorage.setItem(localStorageApi.RESULTS_CACHE_BUSTER_KEY, String(Date.now()));
  return localStorageApi.loadResults({ writeBack: true });
}

export async function replaceResult(resultId, record) {
  const prepared = enrichResultRecordForSave({ ...record, id: resultId });
  validateResultSubmission(prepared);

  localStorageApi.replaceResult(resultId, prepared);
  return localStorageApi.loadResults({ writeBack: false });
}

export async function saveResult(record) {
  const prepared = enrichResultRecordForSave({
    ...record,
    id: record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  });
  validateResultSubmission(prepared);

  localStorageApi.saveResult(prepared);
  return localStorageApi.loadResults({ writeBack: false });
}

export async function deleteResult(resultId) {
  return ensureArray(localStorageApi.deleteResult(resultId));
}

export async function clearAllResults() {
  localStorageApi.clearResults();
  return [];
}

export async function fetchResultById(resultId, { cache = "no-store" } = {}) {
  void cache;
  const all = await fetchAllResults({ cache: "no-store" });
  return all.find((item) => item.id === resultId) ?? null;
}
