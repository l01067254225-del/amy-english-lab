import { getTodayDateString } from "./levels";
import { MAX_MCQ_OPTIONS } from "./mcqOptions";
import { createPassageId } from "./readingPassage";
import { ensureArray } from "./safeData";
import {
  applySetFieldsToQuestion,
  createSetId,
  ensureQuestionSetFields,
  findOrCreateAutoSet,
  getQuestionSetId,
  getQuestionSetName,
  getSetMigrationVersion,
  markSetMigrationComplete,
  migrateQuestionSets,
  MISC_SET_NAME,
  SET_MIGRATION_VERSION,
  suggestSetName,
} from "./examSetStorage";
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
  return createSetId();
}

export { createPassageId, createSetId };

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

  let base = {
    ...question,
    type,
    options,
    level: String(question.level ?? "").trim(),
  };

  if (type === "writing") {
    base = normalizeWritingFields(base);
  }

  if (question.subject === "reading") {
    return ensureQuestionSetFields({
      ...base,
      passage: String(question.passage ?? "").trim(),
      passageId: question.passageId || undefined,
    });
  }

  const { passage: _p, passageId: _pid, ...rest } = base;
  return ensureQuestionSetFields(rest);
}

function runQuestionBankMigration(rawQuestions) {
  const { questions, changed } = migrateQuestionSets(rawQuestions);
  const shouldPersist =
    changed || getSetMigrationVersion() < SET_MIGRATION_VERSION;

  if (shouldPersist) {
    writeJson(QUESTION_BANK_KEY, questions);
    markSetMigrationComplete();
  }

  return questions;
}

export function loadQuestionBank() {
  const raw = ensureArray(readJson(QUESTION_BANK_KEY));
  const migrated = runQuestionBankMigration(raw);
  return migrated.map(normalizeQuestion);
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
  setId = "",
  setName = "",
  materialSetId = "",
  materialSetName = "",
}) {
  const existing = loadQuestionBank();
  const normalizedType =
    subject === "writing" ? "writing" : type === "objective" ? "objective" : "subjective";

  let resolvedSetId = String(setId || materialSetId || "").trim();
  let resolvedSetName = String(setName || materialSetName || "").trim();
  let isAutoSet = false;

  if (!resolvedSetId || !resolvedSetName) {
    if (resolvedSetName && !resolvedSetId) {
      resolvedSetId = createSetId();
    } else {
      const autoSet = findOrCreateAutoSet(subject, level, existing);
      resolvedSetId = autoSet.setId;
      resolvedSetName = autoSet.setName;
      isAutoSet = true;
    }
  }

  let item = applySetFieldsToQuestion(
    {
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
    },
    { setId: resolvedSetId, setName: resolvedSetName, isAutoSet }
  );

  if (normalizedType === "writing") {
    item = normalizeWritingFields({
      ...item,
      givenWords: String(givenWords ?? "").trim(),
    });
  }

  item = applyReadingFields(item, subject, passage, passageId);
  item = normalizeQuestion(item);

  const next = [item, ...existing];
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function addQuestionsBulk(
  items,
  { setId = "", setName = "", materialSetId = "", materialSetName = "" } = {}
) {
  const baseTime = Date.now();
  const existing = loadQuestionBank();
  const sharedSetId =
    String(setId || materialSetId || "").trim() || createSetId();
  const sharedSetName =
    String(setName || materialSetName || "").trim() ||
    suggestSetName(items[0]?.subject, items[0]?.level);

  const newItems = items.map((item, index) => {
    const type = resolveQuestionType(item);
    const resolvedSetId =
      String(item.setId ?? item.materialId ?? item.materialSetId ?? sharedSetId).trim() ||
      sharedSetId;
    const resolvedSetName =
      String(
        item.setName ?? item.materialName ?? item.materialSetName ?? sharedSetName
      ).trim() || sharedSetName;

    let question = applySetFieldsToQuestion(
      {
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
        createdAt: new Date().toISOString(),
      },
      { setId: resolvedSetId, setName: resolvedSetName, isAutoSet: false }
    );

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

  const next = [...newItems, ...existing];
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

export function removeQuestionsBySetId(setId) {
  const targetId = String(setId ?? "").trim();
  const next = loadQuestionBank().filter((q) => getQuestionSetId(q) !== targetId);
  writeJson(QUESTION_BANK_KEY, next);
  return next;
}

export function replaceQuestionsForSet(setId, items, { setName = "" } = {}) {
  const targetId = String(setId ?? "").trim();
  const resolvedSetName = String(setName ?? "").trim();
  removeQuestionsBySetId(targetId);
  if (!ensureArray(items).length) {
    return loadQuestionBank();
  }
  return addQuestionsBulk(items, {
    setId: targetId,
    setName: resolvedSetName,
  });
}

export function removeQuestionsByMaterialSet(materialSetId) {
  return removeQuestionsBySetId(materialSetId);
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

export function addExamSet({
  title,
  questions,
  targetLevel,
  testDate,
  vocaSource = null,
  materialSource = null,
  setSource = null,
}) {
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
    ...(setSource ? { setSource } : {}),
  };
  const next = [item, ...loadExamSets()];
  writeJson(EXAM_SETS_KEY, next);
  return next;
}

export function updateExamSet(examId, updates) {
  const list = loadExamSets();
  const index = list.findIndex((exam) => exam.id === examId);
  if (index < 0) return list;

  const current = list[index];
  const questions = ensureArray(updates.questions ?? current.questions).map(normalizeQuestion);

  const nextItem = {
    id: examId,
    createdAt: current.createdAt,
    title: String(updates.title ?? current.title).trim(),
    targetLevel: String(updates.targetLevel ?? current.targetLevel ?? "").trim(),
    testDate: String(updates.testDate ?? current.testDate ?? "").trim(),
    questionIds: questions.map((question) => question.id),
    questions,
    setSource: updates.setSource ?? null,
  };

  if (updates.vocaSource) {
    nextItem.vocaSource = updates.vocaSource;
  } else if (updates.materialSource) {
    nextItem.materialSource = updates.materialSource;
  }

  const next = [...list];
  next[index] = nextItem;
  writeJson(EXAM_SETS_KEY, next);
  return next;
}

export function deleteExamSet(examId) {
  const next = loadExamSets().filter((exam) => exam.id !== examId);
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
