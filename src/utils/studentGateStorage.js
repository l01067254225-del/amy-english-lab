const GATE_STATE_KEY = "amy-test-student-gate-state";

const DEFAULT_STATE = {
  view: "dashboard",
  activeExamId: null,
  activeResultId: null,
  retestResultId: null,
  examReviewMode: false,
};

export function loadStudentGateState() {
  try {
    const raw = localStorage.getItem(GATE_STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      view: parsed?.view ?? "dashboard",
      activeExamId: parsed?.activeExamId ?? null,
      activeResultId: parsed?.activeResultId ?? null,
      retestResultId: parsed?.retestResultId ?? null,
      examReviewMode: Boolean(parsed?.examReviewMode),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveStudentGateState(state) {
  localStorage.setItem(
    GATE_STATE_KEY,
    JSON.stringify({
      view: state.view ?? "dashboard",
      activeExamId: state.activeExamId ?? null,
      activeResultId: state.activeResultId ?? null,
      retestResultId: state.retestResultId ?? null,
      examReviewMode: Boolean(state.examReviewMode),
    })
  );
}

export function clearStudentGateState() {
  localStorage.removeItem(GATE_STATE_KEY);
}
