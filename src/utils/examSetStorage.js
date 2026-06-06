import { getSubjectLabel } from "./questionBankStorage";
import { ensureArray } from "./safeData";
import { shuffleArray } from "./shuffle";

const SET_MIGRATION_VERSION = 3;
const SET_MIGRATION_KEY = "amy-test-set-migration-version";

export const MISC_SET_NAME = "[기타]";

export { SET_MIGRATION_VERSION };

export function getMiscSetId(subject, level = "") {
  const safeSubject = String(subject ?? "unknown").trim() || "unknown";
  const safeLevel = String(level ?? "").trim() || "none";
  return `misc_${safeSubject}_${safeLevel}`.replace(/\s+/g, "_");
}

export function ensureQuestionSetFields(question) {
  let setId = getQuestionSetId(question);
  let setName = getQuestionSetName(question);

  if (!setId && !setName) {
    return applySetFieldsToQuestion(question, {
      setId: getMiscSetId(question?.subject, question?.level),
      setName: MISC_SET_NAME,
      isAutoSet: true,
    });
  }

  if (!setName) {
    setName = MISC_SET_NAME;
  }
  if (!setId) {
    setId = getMiscSetId(question?.subject, question?.level);
  }

  return applySetFieldsToQuestion(question, {
    setId,
    setName,
    isAutoSet: Boolean(question?.isAutoSet) || setName === MISC_SET_NAME,
  });
}

export function createSetId() {
  return `set_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const SET_NAME_EXAMPLES = {
  vocab: "예: 중등 필수 어휘 Day 1",
  writing: "예: Writing 기본문형 Unit 3",
  grammar: "예: 중등 문법 완성 Ch.1",
  reading: "예: 수능 독해 기출 Day 5",
  default: "예: 중등 문법 완성 Ch.1 / 수능 독해 기출 Day 5",
};

export function getSetNamePlaceholder(subject = "grammar", level = "") {
  const example = SET_NAME_EXAMPLES[subject] ?? SET_NAME_EXAMPLES.default;
  if (!level) return example;
  const sample = example.replace(/^예:\s*/, "");
  return `예: ${level} ${sample}`;
}

export function suggestSetName(subject = "grammar", level = "") {
  const subjectLabel = getSubjectLabel(subject);
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  const prefix = level ? `${level} ` : "";
  return `${prefix}${subjectLabel} 자료 (${dateLabel})`;
}

export function formatAutoSetName(subject, level, dateKey) {
  const subjectLabel = getSubjectLabel(subject);
  const [year, month, day] = String(dateKey ?? "").split("-");
  const dateLabel =
    year && month && day
      ? `${Number(month)}월 ${Number(day)}일`
      : new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  const levelPrefix = level ? `${level} ` : "";
  return `자동 생성 세트 · ${levelPrefix}${subjectLabel} · ${dateLabel}`;
}

export function getRegistrationDateKey(createdAt) {
  const iso = String(createdAt ?? new Date().toISOString());
  return iso.slice(0, 10);
}

export function getQuestionSetId(question) {
  return String(
    question?.setId ??
      question?.materialId ??
      question?.materialSetId ??
      ""
  ).trim();
}

export function getQuestionSetName(question) {
  return String(
    question?.setName ??
      question?.materialName ??
      question?.materialSetName ??
      ""
  ).trim();
}

function readSetNameCandidates(question) {
  const names = [
    question?.setName,
    question?.materialName,
    question?.materialSetName,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return [...new Set(names)];
}

function getLegacyGroupKey(question) {
  const setId = getQuestionSetId(question);
  if (setId) return `id:${setId}`;

  const names = readSetNameCandidates(question);
  if (names.length === 1) {
    return `named:${question.subject}:${question.level}:${names[0]}`;
  }

  if (question?.subject === "reading" && question?.passageId) {
    return `passage:${question.passageId}`;
  }

  const dateKey = getRegistrationDateKey(question.createdAt);
  return `auto:${question.subject}:${question.level}:${dateKey}`;
}

function resolveGroupSetName(members, isAutoGroup) {
  const explicitNames = new Set();
  members.forEach((question) => {
    readSetNameCandidates(question).forEach((name) => explicitNames.add(name));
  });

  if (explicitNames.size === 1) {
    return [...explicitNames][0];
  }

  if (isAutoGroup || explicitNames.size === 0) {
    return MISC_SET_NAME;
  }

  const first = members[0];
  const dateKey = getRegistrationDateKey(first?.createdAt);
  return formatAutoSetName(first?.subject, first?.level, dateKey);
}

function resolveGroupSetId(members, setName) {
  if (setName === MISC_SET_NAME) {
    const first = members[0];
    return getMiscSetId(first?.subject, first?.level);
  }

  const ids = members.map(getQuestionSetId).filter(Boolean);
  if (ids.length > 0) {
    const counts = new Map();
    ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return createSetId();
}

export function applySetFieldsToQuestion(question, { setId, setName, isAutoSet = false }) {
  return {
    ...question,
    setId,
    setName,
    materialSetId: setId,
    materialSetName: setName,
    materialId: setId,
    materialName: setName,
    isAutoSet: Boolean(isAutoSet),
  };
}

export function migrateQuestionSets(questions) {
  const list = ensureArray(questions);
  const groups = new Map();

  list.forEach((question) => {
    const key = getLegacyGroupKey(question);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  });

  let changed = false;
  const migrated = [];

  groups.forEach((members, groupKey) => {
    const isAutoGroup = groupKey.startsWith("auto:") || groupKey.startsWith("passage:");
    const setName = resolveGroupSetName(members, isAutoGroup);
    const setId = resolveGroupSetId(members, setName);

    members.forEach((question) => {
      const next = ensureQuestionSetFields(
        applySetFieldsToQuestion(question, {
          setId,
          setName,
          isAutoSet: isAutoGroup || !readSetNameCandidates(question).length || setName === MISC_SET_NAME,
        })
      );

      if (
        getQuestionSetId(question) !== setId ||
        getQuestionSetName(question) !== setName ||
        Boolean(question.isAutoSet) !== Boolean(next.isAutoSet)
      ) {
        changed = true;
      }

      migrated.push(next);
    });
  });

  return {
    questions: migrated.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ),
    changed,
  };
}

export function getSetMigrationVersion() {
  return Number(localStorage.getItem(SET_MIGRATION_KEY) ?? 0);
}

export function markSetMigrationComplete() {
  localStorage.setItem(SET_MIGRATION_KEY, String(SET_MIGRATION_VERSION));
}

export function findOrCreateAutoSet(subject, level, questions, dateKey = getRegistrationDateKey()) {
  const autoName = formatAutoSetName(subject, level, dateKey);
  const existing = ensureArray(questions).find(
    (question) =>
      question.subject === subject &&
      question.level === level &&
      question.setName === autoName &&
      question.isAutoSet
  );

  if (existing) {
    return { setId: existing.setId, setName: autoName, isAutoSet: true };
  }

  return { setId: createSetId(), setName: autoName, isAutoSet: true };
}

export function buildSetCatalog({
  questions = [],
  vocaSets = [],
  subject = "",
  level = "",
  query = "",
} = {}) {
  const entries = [];
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const normalizedSubject = String(subject ?? "").trim();

  if (!normalizedSubject || normalizedSubject === "vocab") {
    ensureArray(vocaSets).forEach((set) => {
      if (level && set.level !== level) return;
      entries.push({
        setId: set.setId,
        setName: set.setName,
        id: set.setId,
        name: set.setName,
        subject: "vocab",
        level: set.level,
        count: ensureArray(set.words).length,
        kind: "voca",
        words: set.words,
        preview: ensureArray(set.words)
          .slice(0, 3)
          .map((entry) => `${entry.word}(${entry.mean})`)
          .join(", "),
        createdAt: set.createdAt,
        isAutoSet: Boolean(set.isAutoSet),
      });
    });
  }

  if (normalizedSubject && normalizedSubject !== "vocab") {
    const grouped = new Map();

    ensureArray(questions).forEach((rawQuestion) => {
      const question = ensureQuestionSetFields(rawQuestion);
      if (level && question.level !== level) return;
      if (question.subject !== normalizedSubject) return;

      const setId = getQuestionSetId(question);
      if (!grouped.has(setId)) {
        grouped.set(setId, {
          setId,
          setName: getQuestionSetName(question) || MISC_SET_NAME,
          subject: question.subject,
          level: question.level,
          questions: [],
          isAutoSet: Boolean(question.isAutoSet),
        });
      }
      grouped.get(setId).questions.push(question);
    });

    grouped.forEach((group) => {
      entries.push({
        setId: group.setId,
        setName: group.setName,
        id: group.setId,
        name: group.setName,
        subject: group.subject,
        level: group.level,
        count: group.questions.length,
        kind: "questions",
        questions: group.questions,
        questionIds: group.questions.map((question) => question.id),
        preview: group.questions
          .slice(0, 2)
          .map((question) => {
            if (question.subject === "writing" && question.givenWords) {
              return `${String(question.prompt ?? "").slice(0, 20)} · ${question.givenWords}`;
            }
            return String(question.prompt ?? "").slice(0, 36);
          })
          .join(" / "),
        createdAt: group.questions[0]?.createdAt,
        isAutoSet: group.isAutoSet,
      });
    });
  }

  const filtered = entries.filter((entry) => {
    if (!normalizedQuery) return true;
    const haystack = [entry.setName, entry.level, getSubjectLabel(entry.subject), entry.preview]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return filtered.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export function buildSetNameList({
  questions = [],
  vocaSets = [],
  subject = "",
  level = "",
} = {}) {
  const entries = [];
  const normalizedSubject = String(subject ?? "").trim();

  if (!normalizedSubject || normalizedSubject === "vocab") {
    const byName = new Map();

    ensureArray(vocaSets).forEach((set) => {
      if (level && set.level && set.level !== level) return;
      const setName = String(set.setName ?? "").trim() || MISC_SET_NAME;

      if (!byName.has(setName)) {
        byName.set(setName, {
          setName,
          subject: "vocab",
          level: set.level,
          kind: "voca",
          words: [],
          setIds: [],
        });
      }

      const entry = byName.get(setName);
      entry.words.push(...ensureArray(set.words));
      entry.setIds.push(set.setId);
    });

    byName.forEach((entry) => {
      entries.push({ ...entry, count: entry.words.length });
    });
  }

  if (normalizedSubject && normalizedSubject !== "vocab") {
    const byName = new Map();

    ensureArray(questions).forEach((rawQuestion) => {
      const question = ensureQuestionSetFields(rawQuestion);
      if (question.subject !== normalizedSubject) return;
      if (level && question.level && question.level !== level) return;

      const setName = getQuestionSetName(question) || MISC_SET_NAME;

      if (!byName.has(setName)) {
        byName.set(setName, {
          setName,
          subject: question.subject,
          level: question.level,
          kind: "questions",
          questions: [],
          setIds: [],
        });
      }

      const entry = byName.get(setName);
      entry.questions.push(question);
      if (question.setId && !entry.setIds.includes(question.setId)) {
        entry.setIds.push(question.setId);
      }
    });

    byName.forEach((entry) => {
      entries.push({ ...entry, count: entry.questions.length });
    });
  }

  return entries.sort((a, b) => a.setName.localeCompare(b.setName, "ko"));
}

export function collectQuestionIdsFromSets(catalog, selectedSetIds) {
  const idSet = new Set(selectedSetIds);
  const questionIds = new Set();

  ensureArray(catalog)
    .filter((entry) => entry.kind === "questions" && idSet.has(entry.setId))
    .forEach((entry) => {
      ensureArray(entry.questionIds).forEach((questionId) => questionIds.add(questionId));
    });

  return [...questionIds];
}

export function drawQuestionsFromPool(pool, drawCount) {
  const list = ensureArray(pool);
  if (list.length === 0) return [];

  const shuffled = shuffleArray(list);
  const requested = Number(drawCount);
  if (!Number.isFinite(requested) || requested <= 0) {
    return shuffled;
  }

  return shuffled.slice(0, Math.min(Math.floor(requested), shuffled.length));
}

export function filterSetCatalog(catalog, { level = "", subject = "" } = {}) {
  return ensureArray(catalog).filter((entry) => {
    if (level && entry.level !== level) return false;
    if (subject && entry.subject !== subject) return false;
    return true;
  });
}

// Legacy aliases
export const createMaterialSetId = createSetId;
export const MATERIAL_NAME_EXAMPLES = SET_NAME_EXAMPLES;
export const getMaterialNamePlaceholder = getSetNamePlaceholder;
export const suggestMaterialSetName = suggestSetName;
export const getQuestionMaterialName = getQuestionSetName;
export const getQuestionMaterialId = getQuestionSetId;
export const buildMaterialCatalog = buildSetCatalog;
export const collectQuestionIdsFromMaterialSets = collectQuestionIdsFromSets;
export const filterMaterialCatalog = filterSetCatalog;
