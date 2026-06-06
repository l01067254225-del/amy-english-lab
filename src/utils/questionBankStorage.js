import { getTodayDateString } from "./levels";
import { MAX_MCQ_OPTIONS } from "./mcqOptions";
import { createPassageId } from "./readingPassage";
import { ensureArray } from "./safeData";
import { normalizeWritingFields } from "./writingQuestion";

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

function resolveQuestionType(question) {
  if (question.type === "objective") return "objective";
  if (question.type === "meaning" || question.type === "spelling") return question.type;
  if (question.type === "writing" || question.subject === "writing") return "writing";
  return "subjective";
}

export function normalizeQuestion(question) {
  const type = resolveQuestionType(question);
  const options =
    type === "objective" && Array.isArray(question.options)
      ? question.options.slice(0, MAX_MCQ_OPTIONS).map((option) => String(option ?? "").trim())
      : [];

  const materialSetId =
    String(question.materialId ?? question.materialSetId ?? "").trim() || undefined;
  const materialSetName =
    String(
      question.materialName ?? question.materialSetName ?? question.setName ?? ""
    ).trim() || undefined;

  let base = {
    ...question,
    type,
    options,
    level: String(question.level ?? "").trim(),
    materialSetId,
    materialSetName,
    materialId: materialSetId,
    materialName: materialSetName,
  };

  if (type === "writing") {
    base = normalizeWritingFields(base);
  }

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
  givenWords = "",
}) {
  const normalizedType =
    subject === "writing" ? "writing" : type === "objective" ? "objective" : "subjective";
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

  if (normalizedType === "writing") {
    item = normalizeWritingFields({
      ...item,
      givenWords: String(givenWords ?? "").trim(),
    });
  }

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
    const type = resolveQuestionType(item);
    const resolvedMaterialSetId =
      String(item.materialId ?? item.materialSetId ?? sharedMaterialSetId ?? "").trim() ||
      undefined;
    const resolvedMaterialSetName =
      String(item.materialName ?? item.materialSetName ?? sharedMaterialSetName ?? "").trim() ||
      undefined;

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
      materialSetId: resolvedMaterialSetId,
      materialSetName: resolvedMaterialSetName,
      materialId: resolvedMaterialSetId,
      materialName: resolvedMaterialSetName,
      createdAt: new Date().toISOString(),
    };

    if (type === "writing") {
      question = normalizeWritingFields({
        ...question,
        givenWords: String(item.givenWords ?? "").trim(),
      });
    }

    question = applyReadingFields(
      question,
      item.subject,
      item.passage,
      item.passageId
    );
    return normalizeQuestion(question);
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
  const targetId = String(materialSetId ?? "").trim();
  const next = loadQuestionBank().filter((q) => {
    const id = String(q.materialId ?? q.materialSetId ?? "").trim();
    return id !== targetId;
  });
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function formatQuestionAnswer(question) {
  const q = normalizeQuestion(question);
  if (q.type === "writing") {
    return q.answer;
  }
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
