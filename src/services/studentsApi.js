import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "../firebase";
import { normalizePoints, loadLocalStudentPoints } from "../utils/pointsStorage";
import {
  STUDENTS_STORAGE_KEY,
  findStudentByLoginId,
  loadStudents,
} from "../utils/studentStorage";

export const USERS_COLLECTION = "users";

export function isStudentsFirebaseReady() {
  return Boolean(getFirestoreDb());
}

function mapUserDoc(data, loginId) {
  return {
    id: String(data?.id ?? loginId).trim(),
    uid: String(data?.uid ?? "").trim(),
    name: String(data?.name ?? loginId).trim(),
    level: String(data?.level ?? "").trim(),
    school: String(data?.school ?? "").trim(),
    grade: String(data?.grade ?? "").trim(),
    points: normalizePoints(data?.points ?? loadLocalStudentPoints(loginId)),
    updatedAt: data?.updatedAt,
  };
}

export function studentToUserDoc(student) {
  if (!student) return null;
  const loginId = String(student.id ?? "").trim();
  return {
    id: loginId,
    uid: String(student.uid ?? "").trim(),
    name: String(student.name ?? student.id ?? "").trim(),
    level: String(student.level ?? "").trim(),
    school: String(student.school ?? "").trim(),
    grade: String(student.grade ?? "").trim(),
    points: loadLocalStudentPoints(loginId),
    updatedAt: student.updatedAt || new Date().toISOString(),
  };
}

function getUserDocRef(studentLoginId) {
  const db = getFirestoreDb();
  const loginId = String(studentLoginId ?? "").trim();
  if (!db || !loginId) return null;
  return doc(db, USERS_COLLECTION, loginId);
}

export async function upsertStudentUser(student) {
  const payload = studentToUserDoc(student);
  if (!payload?.id) return false;

  const ref = getUserDocRef(payload.id);
  if (!ref) return false;

  try {
    const existing = await getDoc(ref);
    await setDoc(ref, payload, { merge: true });
    if (!existing.exists() || existing.data()?.points == null) {
      await setDoc(ref, { points: 0 }, { merge: true });
    }
    return true;
  } catch (error) {
    console.error("Failed to upsert student user:", error);
    return false;
  }
}

export async function fetchStudentUser(studentLoginId) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId) return null;

  const ref = getUserDocRef(loginId);
  if (ref) {
    try {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return mapUserDoc(snapshot.data(), loginId);
      }
    } catch (error) {
      console.error("Failed to fetch student user:", error);
    }
  }

  const local = findStudentByLoginId(loginId);
  return local ? studentToUserDoc(local) : null;
}

function readLocalStudentProfile(studentLoginId) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId) return null;
  const local = findStudentByLoginId(loginId);
  return local ? studentToUserDoc(local) : null;
}

/**
 * 로그인 학생 프로필 실시간 구독
 * - Firebase users/{loginId} onSnapshot
 * - localStorage roster 변경·주기적 폴링 (Firebase 미설정·동일 브라우저 대비)
 * @returns {() => void} unsubscribe
 */
export function subscribeStudentUser(studentLoginId, onUpdate) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId || typeof onUpdate !== "function") {
    return () => {};
  }

  const cleanups = [];
  let lastKey = "";

  const emit = (profile) => {
    if (!profile?.id) return;
    const key = `${profile.level}|${profile.name}|${profile.points}|${profile.updatedAt ?? ""}`;
    if (key === lastKey) return;
    lastKey = key;
    onUpdate(profile);
  };

  const syncLocal = () => {
    emit(readLocalStudentProfile(loginId));
  };

  syncLocal();

  const pollId = window.setInterval(syncLocal, 4000);
  cleanups.push(() => window.clearInterval(pollId));

  const onStorage = (event) => {
    if (event.key === STUDENTS_STORAGE_KEY) syncLocal();
  };
  window.addEventListener("storage", onStorage);
  cleanups.push(() => window.removeEventListener("storage", onStorage));

  const onStudentsUpdated = () => syncLocal();
  window.addEventListener("amy-students-updated", onStudentsUpdated);
  cleanups.push(() =>
    window.removeEventListener("amy-students-updated", onStudentsUpdated)
  );

  const onPointsUpdated = (event) => {
    if (!event?.detail?.studentId || event.detail.studentId === loginId) {
      syncLocal();
    }
  };
  window.addEventListener("amy-points-updated", onPointsUpdated);
  cleanups.push(() =>
    window.removeEventListener("amy-points-updated", onPointsUpdated)
  );

  const ref = getUserDocRef(loginId);
  if (ref) {
    const unsubSnapshot = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          syncLocal();
          return;
        }
        emit(mapUserDoc(snapshot.data(), loginId));
      },
      (error) => {
        console.error("Student user snapshot error:", error);
        syncLocal();
      }
    );
    cleanups.push(unsubSnapshot);
  }

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.warn("Student subscription cleanup failed:", error);
      }
    });
  };
}

export async function syncAllStudentsToFirebase() {
  if (!isFirebaseConfigured()) return { synced: 0, failed: 0 };

  const students = loadStudents();
  let synced = 0;
  let failed = 0;

  for (const student of students) {
    const ok = await upsertStudentUser(student);
    if (ok) synced += 1;
    else failed += 1;
  }

  return { synced, failed };
}
