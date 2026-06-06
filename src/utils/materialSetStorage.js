import { getSubjectLabel } from "./questionBankStorage";
import { ensureArray } from "./safeData";

export function createMaterialSetId() {
  return `mat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const MATERIAL_NAME_EXAMPLES = {
  vocab: "예: 중등 필수 어휘 Day 1",
  writing: "예: Writing 기본문형 Unit 3",
  grammar: "예: 중등 문법 완성 Ch.1",
  reading: "예: 수능 독해 기출 Day 5",
  default: "예: 중등 문법 완성 Ch.1 / 수능 독해 기출 Day 5",
};

export function getMaterialNamePlaceholder(subject = "grammar", level = "") {
  const example = MATERIAL_NAME_EXAMPLES[subject] ?? MATERIAL_NAME_EXAMPLES.default;
  if (!level) return example;
  const sample = example.replace(/^예:\s*/, "");
  return `예: ${level} ${sample}`;
}

export function suggestMaterialSetName(subject = "grammar", level = "") {
  const subjectLabel = getSubjectLabel(subject);
  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  const prefix = level ? `${level} ` : "";
  return `${prefix}${subjectLabel} 자료 (${dateLabel})`;
}

export function buildMaterialCatalog({
  questions = [],
  vocaSets = [],
  subject = "all",
  level = "",
  query = "",
} = {}) {
  const entries = [];
  const normalizedQuery = String(query ?? "").trim().toLowerCase();

  if (subject === "all" || subject === "vocab") {
    ensureArray(vocaSets).forEach((set) => {
      if (level && set.level !== level) return;
      entries.push({
        id: set.setId,
        name: set.setName,
        subject: "vocab",
        level: set.level,
        count: ensureArray(set.words).length,
        kind: "voca",
        preview: ensureArray(set.words)
          .slice(0, 3)
          .map((entry) => `${entry.word}(${entry.mean})`)
          .join(", "),
        createdAt: set.createdAt,
      });
    });
  }

  if (subject !== "vocab") {
    const grouped = new Map();

    ensureArray(questions).forEach((question) => {
      if (!question?.materialSetId) return;
      if (level && question.level !== level) return;
      if (subject !== "all" && question.subject !== subject) return;

      if (!grouped.has(question.materialSetId)) {
        grouped.set(question.materialSetId, {
          id: question.materialSetId,
          name: question.materialSetName || "이름 없는 시험 자료",
          subject: question.subject,
          level: question.level,
          questions: [],
        });
      }
      grouped.get(question.materialSetId).questions.push(question);
    });

    grouped.forEach((group) => {
      entries.push({
        id: group.id,
        name: group.name,
        subject: group.subject,
        level: group.level,
        count: group.questions.length,
        kind: "questions",
        questionIds: group.questions.map((question) => question.id),
        preview: group.questions
          .slice(0, 2)
          .map((question) => String(question.prompt ?? "").slice(0, 36))
          .join(" / "),
        createdAt: group.questions[0]?.createdAt,
      });
    });
  }

  const filtered = entries.filter((entry) => {
    if (!normalizedQuery) return true;
    const haystack = [entry.name, entry.level, getSubjectLabel(entry.subject), entry.preview]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return filtered.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export function collectQuestionIdsFromMaterialSets(catalog, selectedIds) {
  const idSet = new Set(selectedIds);
  const questionIds = new Set();

  ensureArray(catalog)
    .filter((entry) => entry.kind === "questions" && idSet.has(entry.id))
    .forEach((entry) => {
      ensureArray(entry.questionIds).forEach((questionId) => questionIds.add(questionId));
    });

  return [...questionIds];
}

export function filterMaterialCatalog(catalog, { level = "", subject = "all" } = {}) {
  return ensureArray(catalog).filter((entry) => {
    if (level && entry.level !== level) return false;
    if (subject !== "all" && entry.subject !== subject) return false;
    return true;
  });
}
