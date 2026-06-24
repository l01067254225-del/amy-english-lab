import * as localStorageApi from "../utils/resultsStorage";
import { resolveResultByStudentAndDate } from "../utils/resultDetailLoader";
import { enrichResultRecordForSave } from "../utils/resultAnswerStorage";
import {
  ExamSubmissionValidationError,
  validateResultSubmission,
} from "../utils/examSubmissionValidation";
import { ensureArray } from "../utils/safeData";
import { isFirebaseConfigured } from "../firebase";
import {
  isExamResultsFirebaseReady,
  syncExamResultToFirebase,
} from "./examResultsApi";

export { formatDate } from "../utils/resultsStorage";
export { ExamSubmissionValidationError } from "../utils/examSubmissionValidation";

export function isFirebaseReady() {
  return isExamResultsFirebaseReady();
}

export function getSyncMode() {
  return isFirebaseConfigured() ? "cloud" : "local";
}

async function persistResultLocally(prepared, { replaceId = null } = {}) {
  if (replaceId) {
    localStorageApi.replaceResult(replaceId, prepared);
  } else {
    localStorageApi.saveResult(prepared);
  }

  void syncExamResultToFirebase(prepared);
  return localStorageApi.loadResults({ writeBack: false });
}

export async function fetchAllResults({ cache = "no-store" } = {}) {
  void cache;
  localStorageApi.loadResults({ writeBack: true });
  return localStorageApi.loadResults({ writeBack: true });
}

export async function replaceResult(resultId, record) {
  const prepared = enrichResultRecordForSave({ ...record, id: resultId });
  validateResultSubmission(prepared);

  return persistResultLocally(prepared, { replaceId: resultId });
}

export async function saveResult(record) {
  const prepared = enrichResultRecordForSave({
    ...record,
    id: record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  });
  validateResultSubmission(prepared);

  return persistResultLocally(prepared);
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

export async function fetchResultDetailByStudentDate(
  { studentId, studentName, submittedAt, resultId },
  { cache = "no-store" } = {}
) {
  void cache;
  const all = await fetchAllResults({ cache: "no-store" });
  return (
    resolveResultByStudentAndDate(all, {
      studentId,
      studentName,
      submittedAt,
      resultId,
    }) ?? null
  );
}
