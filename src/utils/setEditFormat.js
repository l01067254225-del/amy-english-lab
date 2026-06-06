import { parseQuestionText } from "./parseQuestionText";
import { parseVocabEntries } from "./parseVocabText";
import { parseWritingEntries } from "./parseWritingText";

const OPTION_CIRCLES = ["①", "②", "③", "④", "⑤"];

function serializeObjectiveBlock(question, index) {
  const lines = [`${index + 1}. ${question.prompt}`];
  ensureOptions(question.options).forEach((option, optionIndex) => {
    lines.push(`${OPTION_CIRCLES[optionIndex] ?? `${optionIndex + 1}.`} ${option}`);
  });
  lines.push(`정답: ${question.answer}`);
  return lines.join("\n");
}

function serializeSubjectiveBlock(question, index) {
  return `${index + 1}. ${question.prompt}\n정답: ${question.answer}`;
}

function serializeWritingBlock(question) {
  return [question.prompt, question.givenWords ?? "", question.answer].join("\n");
}

function ensureOptions(options) {
  return Array.isArray(options) ? options.filter(Boolean) : [];
}

export function serializeSetContent(entry) {
  if (!entry) return "";

  if (entry.kind === "voca") {
    return ensureArray(entry.words)
      .map((word) => `${word.word} ${word.mean}`)
      .join("\n");
  }

  const questions = ensureArray(entry.questions);
  if (questions.length === 0) return "";

  if (entry.subject === "writing") {
    return questions.map((question) => serializeWritingBlock(question)).join("\n\n");
  }

  if (entry.subject === "reading") {
    const passage = String(
      questions[0]?.readingPassage ?? questions[0]?.passage ?? ""
    ).trim();
    const blocks = questions.map((question, index) => {
      if (question.type === "objective" && ensureOptions(question.options).length >= 2) {
        return serializeObjectiveBlock(question, index);
      }
      return serializeSubjectiveBlock(question, index);
    });
    return `[지문]\n${passage}\n[/지문]\n\n${blocks.join("\n\n")}`;
  }

  return questions
    .map((question, index) => {
      if (question.type === "objective" && ensureOptions(question.options).length >= 2) {
        return serializeObjectiveBlock(question, index);
      }
      return serializeSubjectiveBlock(question, index);
    })
    .join("\n\n");
}

export function parseSetEditContent({ entry, contentText }) {
  const subject = entry?.subject ?? "grammar";
  const level = String(entry?.level ?? "").trim();
  const normalizedText = String(contentText ?? "").trim();

  if (!normalizedText) {
    return { ok: false, errors: ["문제 및 정답 내용을 입력해 주세요."] };
  }

  if (entry?.kind === "voca") {
    const { entries, errors } = parseVocabEntries(normalizedText);
    if (entries.length === 0) {
      return {
        ok: false,
        errors: errors.length ? errors : ["등록할 Voca 단어를 찾지 못했습니다."],
      };
    }
    return {
      ok: true,
      kind: "voca",
      words: entries.map((item) => ({ word: item.word, mean: item.meaning })),
      errors,
    };
  }

  if (subject === "writing") {
    const { entries, errors } = parseWritingEntries(normalizedText);
    if (entries.length === 0) {
      return {
        ok: false,
        errors: errors.length ? errors : ["등록할 Writing 문항을 찾지 못했습니다."],
      };
    }
    return {
      ok: true,
      kind: "questions",
      items: entries.map((item) => ({ ...item, subject: "writing", level })),
      errors,
    };
  }

  const { items, errors } = parseQuestionText(normalizedText, { defaultSubject: subject });
  if (items.length === 0) {
    return {
      ok: false,
      errors: errors.length ? errors : ["등록할 문항을 찾지 못했습니다."],
    };
  }

  const enrichedItems = items.map((item) => {
    const next = { ...item, subject: item.subject ?? subject, level };
    if (subject === "reading" && entry?.questions?.[0]?.passageId) {
      next.passageId = entry.questions[0].passageId;
    }
    return next;
  });

  return {
    ok: true,
    kind: "questions",
    items: enrichedItems,
    errors,
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
