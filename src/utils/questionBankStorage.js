import { getTodayDateString } from "./levels";
import { MAX_MCQ_OPTIONS } from "./mcqOptions";
import { createPassageId } from "./readingPassage";
import { ensureArray } from "./safeData";

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

export function createMaterialSetId() {
  return `mat_${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export { createPassageId };

function applyReadingFields(item, subject, passage, passageId) {
  if (subject !== "reading") return item;
  const passageText = String(passage ?? "").trim();
  return {
    ...item,
    passage: passageText,
    passageId: passageId || createPassageId(),
  };
}

export function normalizeQuestion(question) {
  const type =
    question.type === "objective"
      ? "objective"
      : question.type === "meaning" || question.type === "spelling"
        ? question.type
        : "subjective";
  const options =
    type === "objective" && Array.isArray(question.options)
      ? question.options.slice(0, MAX_MCQ_OPTIONS).map((option) => String(option ?? "").trim())
      : [];

  const base = {
    ...question,
    type,
    options,
    level: String(question.level ?? "").trim(),
    materialSetId: String(question.materialSetId ?? "").trim() || undefined,
    materialSetName:
      String(question.materialSetName ?? question.setName ?? "").trim() || undefined,
  };

  if (question.subject === "reading") {
    return {
      ...base,
      passage: String(question.passage ?? "").trim(),
      passageId: question.passageId || undefined,
    };
  }

  const { passage: _p, passageId: _pid, ...rest } = base;
  return rest;
}

export function loadQuestionBank() {
  return ensureArray(readJson(QUESTION_BANK_KEY)).map(normalizeQuestion);
}

export function addQuestion({
  subject,
  prompt,
  answer,
  type = "subjective",
  options = [],
  passage = "",
  passageId = null,
  level = "",
}) {
  const normalizedType = type === "objective" ? "objective" : "subjective";
  let item = {
    id: createQuestionId(),
    type: normalizedType,
    subject,
    prompt: prompt.trim(),
    answer: String(answer).trim(),
    options:
      normalizedType === "objective"
        ? options.map((option) => String(option).trim())
        : [],
    level: String(level ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  item = applyReadingFields(item, subject, passage, passageId);

  const next = [item, ...loadQuestionBank()];
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function addQuestionsBulk(items, { materialSetId = "", materialSetName = "" } = {}) {
  const baseTime = Date.now();
  const sharedMaterialSetId = String(materialSetId ?? "").trim() || undefined;
  const sharedMaterialSetName = String(materialSetName ?? "").trim() || undefined;

  const newItems = items.map((item, index) => {
    const type =
      item.type === "objective"
        ? "objective"
        : item.type === "meaning" || item.type === "spelling"
          ? item.type
          : "subjective";
    let question = {
      id: `qb-${baseTime + index}-${Math.random().toString(36).slice(2, 11)}`,
      type,
      subject: item.subject,
      prompt: String(item.prompt).trim(),
      answer: String(item.answer).trim(),
      options:
        type === "objective" && Array.isArray(item.options)
          ? item.options.map((option) => String(option).trim())
          : [],
      level: String(item.level ?? "").trim(),
      materialSetId: String(item.materialSetId ?? sharedMaterialSetId ?? "").trim() || undefined,
      materialSetName:
        String(item.materialSetName ?? sharedMaterialSetName ?? "").trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    question = applyReadingFields(
      question,
      item.subject,
      item.passage,
      item.passageId
    );
    return question;
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

export function removeReadingPassageGroup(passageId) {
  const next = loadQuestionBank().filter((q) => q.passageId !== passageId);
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function removeQuestionsByMaterialSet(materialSetId) {
  const next = loadQuestionBank().filter((q) => q.materialSetId !== materialSetId);
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
  return ensureArray(readJson(EXAM_SETS_KEY));
}

export function addExamSet({ title, questions, targetLevel, testDate, vocaSource = null, materialSource = null }) {
  const item = {
    id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    targetLevel: String(targetLevel ?? "").trim(),
    testDate: String(testDate ?? "").trim(),
    questionIds: questions.map((q) => q.id),
    questions: questions.map(normalizeQuestion),
    createdAt: new Date().toISOString(),
    ...(vocaSource ? { vocaSource } : {}),
    ...(materialSource ? { materialSource } : {}),
  };
  const next = [item, ...loadExamSets()];
  writeJson(EXAM_SETS_KEY, next);
  return next;
}

export function filterQuestionsByLevel(questions, targetLevel) {
  const list = ensureArray(questions);
  if (!targetLevel) return list;
  return list.filter((q) => q?.level === targetLevel);
}

export function getAvailableExamsForStudent(level, date = getTodayDateString()) {
  const studentLevel = String(level ?? "").trim();
  const today = String(date ?? "").trim();
  if (!studentLevel || !today) return [];

  return loadExamSets().filter(
    (exam) =>
      exam?.targetLevel === studentLevel &&
      exam?.testDate === today &&
      ensureArray(exam?.questions).length > 0
  );
}

export { getTodayDateString };
