import * as localStorageApi from "../utils/resultsStorage";
import {
  enrichResultRecordForSave,
  normalizeStoredResults,
} from "../utils/resultAnswerStorage";
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

export async function fetchAllResults() {
  return normalizeStoredResults(localStorageApi.loadResults());
}

export async function replaceResult(resultId, record) {
  const prepared = enrichResultRecordForSave({ ...record, id: resultId });
  validateResultSubmission(prepared);

  localStorageApi.replaceResult(resultId, prepared);
  return normalizeStoredResults(localStorageApi.loadResults());
}

export async function saveResult(record) {
  const prepared = enrichResultRecordForSave({
    ...record,
    id: record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  });
  validateResultSubmission(prepared);

  localStorageApi.saveResult(prepared);
  return normalizeStoredResults(localStorageApi.loadResults());
}

export async function deleteResult(resultId) {
  return ensureArray(localStorageApi.deleteResult(resultId));
}

export async function clearAllResults() {
  localStorageApi.clearResults();
  return [];
}
