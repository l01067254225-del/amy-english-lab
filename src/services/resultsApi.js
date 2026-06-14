import { db } from "../firebase"; // 아까 만든 firebase.js 연결
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { enrichResultRecordForSave } from "../utils/resultAnswerStorage";
import { validateResultSubmission } from "../utils/examSubmissionValidation";
import { ensureArray } from "../utils/safeData";

export { formatDate } from "../utils/resultsStorage";
export { ExamSubmissionValidationError } from "../utils/examSubmissionValidation";

const COLLECTION_NAME = "results";

export function isFirebaseReady() {
  return true; // Firebase 연결 활성화
}

export function getSyncMode() {
  return "firebase";
}

export async function fetchAllResults() {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function replaceResult(resultId, record) {
  const prepared = enrichResultRecordForSave({ ...record, id: resultId });
  validateResultSubmission(prepared);
  await setDoc(doc(db, COLLECTION_NAME, resultId), prepared);
  return await fetchAllResults();
}

export async function saveResult(record) {
  const id = record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const prepared = enrichResultRecordForSave({ ...record, id });
  validateResultSubmission(prepared);
  await setDoc(doc(db, COLLECTION_NAME, id), prepared);
  return await fetchAllResults();
}

export async function deleteResult(resultId) {
  await deleteDoc(doc(db, COLLECTION_NAME, resultId));
  return await fetchAllResults();
}

export async function clearAllResults() {
  // 전체 삭제는 위험하므로 필요시 구현
  return [];
}

export async function fetchResultById(resultId) {
  const all = await fetchAllResults();
  return all.find((item) => item.id === resultId) ?? null;
}

export async function fetchResultDetailByStudentDate({ studentId, studentName, submittedAt, resultId }) {
  const all = await fetchAllResults();
  return all.find((item) => item.id === resultId) ?? null;
}