const QUESTION_BANK_KEY = "amy-test-question-bank";
const EXAM_SETS_KEY = "amy-test-exam-sets";

export const SUBJECT_OPTIONS = [
  { id: "vocab", label: "Voca" },
  { id: "writing", label: "Writing" },
  { id: "grammar", label: "Grammar" },
  { id: "reading", label: "Reading" },
];

export function getSubjectLabel(subjectId) {
  return SUBJECT_OPTIONS.find((s) => s.id === subjectId)?.label ?? subjectId;
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadQuestionBank() {
  return readJson(QUESTION_BANK_KEY);
}

export function addQuestion({ subject, prompt, answer }) {
  const item = {
    id: `qb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subject,
    prompt: prompt.trim(),
    answer: answer.trim(),
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadQuestionBank()];
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function removeQuestion(id) {
  const next = loadQuestionBank().filter((q) => q.id !== id);
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function loadExamSets() {
  return readJson(EXAM_SETS_KEY);
}

export function addExamSet({ title, questions }) {
  const item = {
    id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    questionIds: questions.map((q) => q.id),
    questions,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadExamSets()];
  writeJson(EXAM_SETS_KEY, next);
  return next;
}
