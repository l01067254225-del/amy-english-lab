const DRAFT_KEY_PREFIX = "amy-test-exam-draft";

function buildDraftKey(studentId, examId) {
  return `${DRAFT_KEY_PREFIX}:${String(studentId ?? "").trim()}:${String(examId ?? "").trim()}`;
}

export function loadExamDraft(studentId, examId) {
  try {
    const raw = localStorage.getItem(buildDraftKey(studentId, examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      savedAt: parsed.savedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function saveExamDraft(studentId, examId, answers) {
  localStorage.setItem(
    buildDraftKey(studentId, examId),
    JSON.stringify({
      answers: answers ?? {},
      savedAt: new Date().toISOString(),
    })
  );
}

export function clearExamDraft(studentId, examId) {
  localStorage.removeItem(buildDraftKey(studentId, examId));
}
