import { doc, setDoc } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "../firebase";

export const EXAM_RESULTS_COLLECTION = "examResults";

export function isExamResultsFirebaseReady() {
  return Boolean(getFirestoreDb());
}

export async function syncExamResultToFirebase(record) {
  if (!isFirebaseConfigured() || !record?.id) return false;

  const db = getFirestoreDb();
  if (!db) return false;

  try {
    await setDoc(doc(db, EXAM_RESULTS_COLLECTION, record.id), record, { merge: true });
    return true;
  } catch (error) {
    console.error("Failed to sync exam result to Firebase:", error);
    return false;
  }
}
