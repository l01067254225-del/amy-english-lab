const QUESTION_BANK_KEY = "amy-test-question-bank";
const EXAM_SETS_KEY = "amy-test-exam-sets";

export const SUBJECT_OPTIONS = [
  { id: "vocab", label: "Voca", color: "#4f46e5", bg: "#eef2ff" },
  { id: "writing", label: "Writing", color: "#059669", bg: "#ecfdf5" },
  { id: "grammar", label: "Grammar", color: "#d97706", bg: "#fffbeb" },
  { id: "reading", label: "Reading", color: "#7c3aed", bg: "#f5f3ff" },
];

export function getSubjectLabel(subjectId) {
  return SUBJECT_OPTIONS.find((s) => s.id === subjectId)?.label ?? subjectId;
}

export function getSubjectMeta(subjectId) {
  return (
    SUBJECT_OPTIONS.find((s) => s.id === subjectId) ?? {
      id: subjectId,
      label: subjectId,
      color: "#64748b",
      bg: "#f1f5f9",
    }
  );
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

export function createQuestionId() {
  return `qb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizeQuestion(question) {
  const type = question.type === "objective" ? "objective" : "subjective";
  return {
    ...question,
    type,
    options: type === "objective" && Array.isArray(question.options) ? question.options : [],
  };
}

export function loadQuestionBank() {
  return readJson(QUESTION_BANK_KEY).map(normalizeQuestion);
}

export function addQuestion({ subject, prompt, answer, type = "subjective", options = [] }) {
  const normalizedType = type === "objective" ? "objective" : "subjective";
  const item = {
    id: createQuestionId(),
    type: normalizedType,
    subject,
    prompt: prompt.trim(),
    answer: String(answer).trim(),
    options:
      normalizedType === "objective"
        ? options.map((option) => String(option).trim())
        : [],
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadQuestionBank()];
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function addQuestionsBulk(items) {
  const baseTime = Date.now();
  const newItems = items.map((item, index) => {
    const type = item.type === "objective" ? "objective" : "subjective";
    return {
      id: `qb-${baseTime + index}-${Math.random().toString(36).slice(2, 11)}`,
      type,
      subject: item.subject,
      prompt: String(item.prompt).trim(),
      answer: String(item.answer).trim(),
      options:
        type === "objective" && Array.isArray(item.options)
          ? item.options.map((option) => String(option).trim())
          : [],
      createdAt: new Date().toISOString(),
    };
  });
  const next = [...newItems, ...loadQuestionBank()];
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function removeQuestion(id) {
  const next = loadQuestionBank().filter((q) => q.id !== id);
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function formatQuestionAnswer(question) {
  const q = normalizeQuestion(question);
  if (q.type === "objective") {
    const index = Number(q.answer) - 1;
    const optionText = q.options[index];
    return optionText ? `${q.answer}번 · ${optionText}` : `${q.answer}번`;
  }
  return q.answer;
}

export function loadExamSets() {
  return readJson(EXAM_SETS_KEY);
}

export function addExamSet({ title, questions }) {
  const item = {
    id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    questionIds: questions.map((q) => q.id),
    questions: questions.map(normalizeQuestion),
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadExamSets()];
  writeJson(EXAM_SETS_KEY, next);
  return next;
}
