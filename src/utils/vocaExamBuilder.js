import { ensureArray } from "./safeData";
import { createQuestionId } from "./questionBankStorage";
import { shuffleArray } from "./shuffle";

export const VOCA_EXAM_TYPES = [
  { id: "meaning", label: "뜻 쓰기", description: "영어 단어 → 한글 뜻 입력" },
  { id: "spelling", label: "철자(Spelling) 쓰기", description: "한글 뜻 → 영어 철자 입력" },
];

export function buildVocaExamQuestions(words, { examType = "meaning", drawCount } = {}) {
  const pool = ensureUniqueWords(words);
  if (pool.length === 0) return [];

  const requested = Number(drawCount);
  const count =
    Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), pool.length)
      : pool.length;

  const selected = shuffleArray(pool).slice(0, count);

  return selected.map((entry) => {
    const word = String(entry.word ?? "").trim();
    const mean = String(entry.mean ?? entry.meaning ?? "").trim();

    if (examType === "spelling") {
      return {
        id: createQuestionId(),
        type: "subjective",
        subject: "vocab",
        prompt: mean,
        answer: word,
        options: [],
      };
    }

    return {
      id: createQuestionId(),
      type: "subjective",
      subject: "vocab",
      prompt: word,
      answer: mean,
      options: [],
    };
  });
}

function ensureUniqueWords(words) {
  const seen = new Set();
  const unique = [];

  ensureArray(words).forEach((entry) => {
    const word = String(entry?.word ?? "").trim();
    const mean = String(entry?.mean ?? entry?.meaning ?? "").trim();
    if (!word || !mean) return;

    const key = `${word.toLowerCase()}::${mean}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({ word, mean });
  });

  return unique;
}
