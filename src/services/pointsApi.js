import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "../firebase";
import { getTodayDateString } from "../utils/levels";
import {
  appendLocalPointHistory,
  formatPointsDisplay,
  hasLocalPointReward,
  loadLocalPointHistory,
  loadLocalStudentPoints,
  normalizePoints,
  saveLocalStudentPoints,
} from "../utils/pointsStorage";
import { USERS_COLLECTION } from "./studentsApi";

export const POINT_HISTORY_SUBCOLLECTION = "pointHistory";

export { formatPointsDisplay, normalizePoints };

export const POINT_REWARD_REASONS = {
  EXAM_PERFECT: "시험 만점 보상",
  CLINIC_SAME_DAY: "당일 오답 완료 보상",
  ADMIN: "관리자 부여",
};

export const POINT_SOURCE_TYPES = {
  EXAM_PERFECT: "exam_perfect",
  CLINIC_SAME_DAY: "clinic_same_day",
  ADMIN: "admin_adjustment",
};

function getUserDocRef(studentLoginId) {
  const db = getFirestoreDb();
  const loginId = String(studentLoginId ?? "").trim();
  if (!db || !loginId) return null;
  return doc(db, USERS_COLLECTION, loginId);
}

function buildHistoryEntry({ delta, reason, sourceType, sourceId, createdAt }) {
  const created = createdAt ?? new Date().toISOString();
  return {
    delta: Number(delta) || 0,
    reason: String(reason ?? "").trim(),
    date: created.slice(0, 10),
    sourceType: String(sourceType ?? "").trim(),
    sourceId: String(sourceId ?? "").trim(),
    createdAt: created,
  };
}

function buildHistoryDocId(sourceType, sourceId) {
  return `${sourceType}__${sourceId}`.replace(/[^\w-]+/g, "_").slice(0, 200);
}

async function hasFirebasePointReward(studentLoginId, sourceType, sourceId) {
  const db = getFirestoreDb();
  const loginId = String(studentLoginId ?? "").trim();
  if (!db || !loginId || !sourceType || !sourceId) return false;

  try {
    const historyRef = doc(
      db,
      USERS_COLLECTION,
      loginId,
      POINT_HISTORY_SUBCOLLECTION,
      buildHistoryDocId(sourceType, sourceId)
    );
    const snapshot = await getDoc(historyRef);
    return snapshot.exists();
  } catch (error) {
    console.warn("Failed to check point reward duplicate:", error);
    return hasLocalPointReward(studentLoginId, sourceType, sourceId);
  }
}

async function awardPointsFirebase(studentLoginId, payload) {
  const db = getFirestoreDb();
  const loginId = String(studentLoginId ?? "").trim();
  if (!db || !loginId) return null;

  const userRef = doc(db, USERS_COLLECTION, loginId);
  const historyRef = doc(
    db,
    USERS_COLLECTION,
    loginId,
    POINT_HISTORY_SUBCOLLECTION,
    buildHistoryDocId(payload.sourceType, payload.sourceId)
  );
  const entry = buildHistoryEntry(payload);

  const nextPoints = await runTransaction(db, async (transaction) => {
    const historySnap = await transaction.get(historyRef);
    if (entry.sourceType && entry.sourceId && historySnap.exists()) {
      throw new Error("POINT_REWARD_DUPLICATE");
    }

    const userSnap = await transaction.get(userRef);
    const current = normalizePoints(userSnap.data()?.points);
    const updated = normalizePoints(current + entry.delta);

    transaction.set(
      userRef,
      {
        id: loginId,
        points: updated,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    transaction.set(historyRef, {
      ...entry,
      id: historyRef.id,
    });

    return updated;
  }).catch((error) => {
    if (error?.message === "POINT_REWARD_DUPLICATE") return null;
    throw error;
  });

  return nextPoints;
}

function awardPointsLocal(studentLoginId, payload) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId) return null;

  const { sourceType, sourceId } = payload;
  if (sourceType && sourceId && hasLocalPointReward(loginId, sourceType, sourceId)) {
    return null;
  }

  const entry = buildHistoryEntry(payload);
  const current = loadLocalStudentPoints(loginId);
  const next = normalizePoints(current + entry.delta);

  saveLocalStudentPoints(loginId, next);
  appendLocalPointHistory(loginId, entry);
  return next;
}

/**
 * 포인트 지급/차감 + 이력 기록 (중복 sourceType+sourceId 방지)
 */
export async function awardPoints(
  studentLoginId,
  { delta, reason, sourceType = "", sourceId = "", createdAt } = {}
) {
  const loginId = String(studentLoginId ?? "").trim();
  const amount = Number(delta);
  if (!loginId || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, points: loadLocalStudentPoints(loginId), duplicate: false };
  }

  const payload = {
    delta: amount,
    reason: reason || POINT_REWARD_REASONS.ADMIN,
    sourceType,
    sourceId,
    createdAt,
  };

  if (sourceType && sourceId) {
    const duplicated = isFirebaseConfigured()
      ? await hasFirebasePointReward(loginId, sourceType, sourceId)
      : hasLocalPointReward(loginId, sourceType, sourceId);
    if (duplicated) {
      return {
        ok: false,
        points: await fetchStudentPoints(loginId),
        duplicate: true,
      };
    }
  }

  try {
    let nextPoints = null;

    if (isFirebaseConfigured()) {
      nextPoints = await awardPointsFirebase(loginId, payload);
      if (nextPoints == null) {
        return {
          ok: false,
          points: await fetchStudentPoints(loginId),
          duplicate: true,
        };
      }
      saveLocalStudentPoints(loginId, nextPoints);
    } else {
      nextPoints = awardPointsLocal(loginId, payload);
      if (nextPoints == null) {
        return {
          ok: false,
          points: loadLocalStudentPoints(loginId),
          duplicate: true,
        };
      }
    }

    return { ok: true, points: nextPoints, duplicate: false };
  } catch (error) {
    console.error("Failed to award points:", error);
    const fallback = awardPointsLocal(loginId, payload);
    if (fallback == null) {
      return {
        ok: false,
        points: loadLocalStudentPoints(loginId),
        duplicate: true,
      };
    }
    return { ok: true, points: fallback, duplicate: false };
  }
}

export async function fetchStudentPoints(studentLoginId) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId) return 0;

  const ref = getUserDocRef(loginId);
  if (ref) {
    try {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const points = normalizePoints(snapshot.data()?.points);
        saveLocalStudentPoints(loginId, points);
        return points;
      }
    } catch (error) {
      console.warn("Failed to fetch student points:", error);
    }
  }

  return loadLocalStudentPoints(loginId);
}

export async function adjustPointsByAdmin(studentLoginId, delta, reason = "") {
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, message: "지급/차감할 포인트를 입력해 주세요." };
  }

  const resolvedReason =
    String(reason ?? "").trim() ||
    (amount > 0 ? "관리자 지급" : "관리자 차감");

  const result = await awardPoints(studentLoginId, {
    delta: amount,
    reason: resolvedReason,
    sourceType: POINT_SOURCE_TYPES.ADMIN,
    sourceId: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });

  if (!result.ok && result.duplicate) {
    return { ok: false, message: "포인트 처리에 실패했습니다." };
  }

  return {
    ok: true,
    points: result.points,
    message: `${amount > 0 ? "지급" : "차감"} 완료 (${formatPointsDisplay(result.points)})`,
  };
}

export async function rewardExamPerfectScore(studentLoginId, resultId) {
  return awardPoints(studentLoginId, {
    delta: 100,
    reason: POINT_REWARD_REASONS.EXAM_PERFECT,
    sourceType: POINT_SOURCE_TYPES.EXAM_PERFECT,
    sourceId: String(resultId ?? "").trim(),
  });
}

/**
 * 시험 당일 오답 노트 전부 정답 처리 시 +100P
 */
export async function completeIncorrectNotes(result) {
  const studentId = String(result?.studentId ?? result?.studentName ?? "").trim();
  const resultId = String(result?.id ?? "").trim();
  if (!studentId || !resultId) {
    return { ok: false, duplicate: false };
  }

  const examDateKey = getTodayDateString(new Date(result?.submittedAt || Date.now()));
  const clinicSubmittedAt =
    result?.clinicRetest?.latestAttempt?.submittedAt ??
    result?.clinicRetest?.submittedAt ??
    null;
  const clinicDateKey = clinicSubmittedAt
    ? getTodayDateString(new Date(clinicSubmittedAt))
    : getTodayDateString();

  if (examDateKey !== clinicDateKey) {
    return { ok: false, duplicate: false, skipped: true };
  }

  return awardPoints(studentId, {
    delta: 100,
    reason: POINT_REWARD_REASONS.CLINIC_SAME_DAY,
    sourceType: POINT_SOURCE_TYPES.CLINIC_SAME_DAY,
    sourceId: resultId,
    createdAt: clinicSubmittedAt ?? new Date().toISOString(),
  });
}

export function subscribeStudentPoints(studentLoginId, onUpdate) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId || typeof onUpdate !== "function") {
    return () => {};
  }

  const cleanups = [];
  let lastPoints = null;

  const emit = (points) => {
    const normalized = normalizePoints(points);
    if (normalized === lastPoints) return;
    lastPoints = normalized;
    onUpdate(normalized);
  };

  emit(loadLocalStudentPoints(loginId));

  const syncLocal = () => emit(loadLocalStudentPoints(loginId));
  const pollId = window.setInterval(syncLocal, 4000);
  cleanups.push(() => window.clearInterval(pollId));

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
    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          syncLocal();
          return;
        }
        const points = normalizePoints(snapshot.data()?.points);
        saveLocalStudentPoints(loginId, points);
        emit(points);
      },
      (error) => {
        console.error("Student points snapshot error:", error);
        syncLocal();
      }
    );
    cleanups.push(unsub);
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}

export async function fetchPointHistory(studentLoginId, { limit = 20 } = {}) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId) return [];

  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      const snapshot = await getDocs(
        collection(db, USERS_COLLECTION, loginId, POINT_HISTORY_SUBCOLLECTION)
      );
      return snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )
        .slice(0, limit);
    } catch (error) {
      console.warn("Failed to fetch Firebase point history:", error);
    }
  }

  return loadLocalPointHistory(loginId, { limit });
}

export async function ensureUserPointsField(studentLoginId) {
  const loginId = String(studentLoginId ?? "").trim();
  if (!loginId) return 0;

  const ref = getUserDocRef(loginId);
  if (ref) {
    try {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const points = normalizePoints(snapshot.data()?.points);
        if (snapshot.data()?.points == null) {
          await setDoc(ref, { points: 0 }, { merge: true });
        }
        saveLocalStudentPoints(loginId, points);
        return points;
      }
      await setDoc(ref, { id: loginId, points: 0 }, { merge: true });
    } catch (error) {
      console.warn("Failed to ensure user points field:", error);
    }
  }

  const local = loadLocalStudentPoints(loginId);
  if (local === 0) {
    saveLocalStudentPoints(loginId, 0);
  }
  return local;
}
