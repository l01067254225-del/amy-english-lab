import { ensureArray } from "./safeData";

export function resolveQuestionOrder(question) {
  const order = Number(question?.order);
  if (Number.isFinite(order) && order > 0) {
    return order;
  }

  const promptMatch = String(question?.prompt ?? "").trim().match(/^(\d+)\.\s/);
  if (promptMatch) {
    return parseInt(promptMatch[1], 10);
  }

  return 0;
}

export function getReadingProblemGroupKey(question) {
  if (question?.passageId) {
    return `passage:${question.passageId}`;
  }
  const passageNumber = Number(question?.passageNumber);
  if (Number.isFinite(passageNumber) && passageNumber > 0) {
    return `passage-number:${passageNumber}`;
  }
  return `question:${question?.id ?? "unknown"}`;
}

export function compareReadingQuestions(a, b) {
  const passageA = Number(a?.passageNumber);
  const passageB = Number(b?.passageNumber);
  const hasPassageA = Number.isFinite(passageA) && passageA > 0;
  const hasPassageB = Number.isFinite(passageB) && passageB > 0;

  if (hasPassageA && hasPassageB && passageA !== passageB) {
    return passageA - passageB;
  }
  if (hasPassageA && !hasPassageB) return -1;
  if (!hasPassageA && hasPassageB) return 1;

  const orderA = resolveQuestionOrder(a);
  const orderB = resolveQuestionOrder(b);
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  const createdA = String(a?.createdAt ?? "");
  const createdB = String(b?.createdAt ?? "");
  if (createdA !== createdB) {
    return createdA.localeCompare(createdB);
  }

  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

export function sortReadingQuestions(questions) {
  return [...ensureArray(questions)].sort(compareReadingQuestions);
}

export function groupReadingQuestions(questions) {
  const sorted = sortReadingQuestions(questions);
  const groups = [];
  let currentKey = null;
  let currentGroup = null;

  sorted.forEach((question) => {
    const key = getReadingProblemGroupKey(question);
    if (key !== currentKey) {
      currentKey = key;
      currentGroup = {
        key,
        passageId: question.passageId ?? null,
        passageNumber: question.passageNumber ?? null,
        questions: [],
      };
      groups.push(currentGroup);
    }
    currentGroup.questions.push(question);
  });

  return groups;
}

export function drawReadingQuestionsFromPool(pool, drawCount) {
  const sorted = sortReadingQuestions(pool);
  const requested = Number(drawCount);
  if (!Number.isFinite(requested) || requested <= 0) {
    return sorted;
  }
  return sorted.slice(0, Math.min(Math.floor(requested), sorted.length));
}

export function isReadingSubject(subject) {
  return String(subject ?? "").trim().toLowerCase() === "reading";
}
