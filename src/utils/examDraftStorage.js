const DRAFT_KEY_PREFIX = "amy-test-exam-draft";

/** localStorage 키: 학생 ID + 시험 ID (동일 기기·다른 학생 구분) */
export function buildExamDraftKey(studentId, examId) {
  return `${DRAFT_KEY_PREFIX}:${String(studentId ?? "").trim()}:${String(examId ?? "").trim()}`;
}

function sanitizeAnswers(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const next = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;
    next[String(key)] = typeof value === "string" ? value : String(value);
  }
  return next;
}

export function loadExamDraft(studentId, examId) {
  try {
    const raw = localStorage.getItem(buildExamDraftKey(studentId, examId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const currentIndex = Number(parsed.currentIndex);
    return {
      answers: sanitizeAnswers(parsed.answers),
      currentIndex: Number.isFinite(currentIndex) && currentIndex >= 0 ? currentIndex : 0,
      savedAt: parsed.savedAt ?? null,
    };
  } catch (error) {
    console.warn("Failed to load exam draft:", error);
    return null;
  }
}

export function saveExamDraft(studentId, examId, answers, { currentIndex = null } = {}) {
  const key = buildExamDraftKey(studentId, examId);
  if (!key.endsWith(`:${String(examId ?? "").trim()}`) || !String(studentId ?? "").trim()) {
    return false;
  }

  try {
    const payload = {
      examId: String(examId ?? "").trim(),
      studentId: String(studentId ?? "").trim(),
      answers: sanitizeAnswers(answers),
      savedAt: new Date().toISOString(),
    };

    if (currentIndex != null && Number.isFinite(Number(currentIndex))) {
      payload.currentIndex = Math.max(0, Number(currentIndex));
    }

    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn("Failed to save exam draft:", error);
    return false;
  }
}

export function clearExamDraft(studentId, examId) {
  try {
    localStorage.removeItem(buildExamDraftKey(studentId, examId));
    return true;
  } catch (error) {
    console.warn("Failed to clear exam draft:", error);
    return false;
  }
}

export function hasExamDraft(studentId, examId) {
  const draft = loadExamDraft(studentId, examId);
  if (!draft) return false;
  return Object.keys(draft.answers).length > 0;
}
