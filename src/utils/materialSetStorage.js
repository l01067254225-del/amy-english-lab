import { getSubjectLabel } from "./questionBankStorage";
import { ensureArray } from "./safeData";
import { shuffleArray } from "./shuffle";

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

export function getQuestionMaterialName(question) {
  return String(
    question?.materialName ?? question?.materialSetName ?? question?.setName ?? ""
  ).trim();
}

export function getQuestionMaterialId(question) {
  return String(question?.materialId ?? question?.materialSetId ?? "").trim();
}

export function getMaterialGroupKey(question) {
  const materialId = getQuestionMaterialId(question);
  if (materialId) return materialId;

  const materialName = getQuestionMaterialName(question);
  if (materialName) {
    return `name:${question.subject}:${question.level}:${materialName}`;
  }

  if (question?.subject === "reading" && question?.passageId) {
    return `passage:${question.passageId}`;
  }

  return "";
}

export function buildMaterialCatalog({
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

  if (normalizedSubject && normalizedSubject !== "vocab") {
    const grouped = new Map();

    ensureArray(questions).forEach((question) => {
      const groupKey = getMaterialGroupKey(question);
      if (!groupKey) return;
      if (level && question.level !== level) return;
      if (question.subject !== normalizedSubject) return;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          id: groupKey,
          materialId: getQuestionMaterialId(question) || groupKey,
          name: getQuestionMaterialName(question) || "이름 없는 시험 자료",
          subject: question.subject,
          level: question.level,
          questions: [],
        });
      }
      grouped.get(groupKey).questions.push(question);
    });

    grouped.forEach((group) => {
      entries.push({
        id: group.id,
        materialId: group.materialId,
        name: group.name,
        subject: group.subject,
        level: group.level,
        count: group.questions.length,
        kind: "questions",
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

export function filterMaterialCatalog(catalog, { level = "", subject = "" } = {}) {
  return ensureArray(catalog).filter((entry) => {
    if (level && entry.level !== level) return false;
    if (subject && entry.subject !== subject) return false;
    return true;
  });
}
