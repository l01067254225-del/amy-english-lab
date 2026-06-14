import { ensureArray } from "./safeData";
import { createQuestionId } from "./questionBankStorage";
import { shuffleArray } from "./shuffle";

export const VOCA_EXAM_TYPES = [
  { id: "meaning", label: "뜻 쓰기", description: "영어 단어 → 한글 뜻 입력" },
  { id: "spelling", label: "철자(Spelling) 쓰기", description: "한글 뜻 → 영어 철자 입력" },
  {
    id: "mix",
    label: "혼합(Mix) 모드",
    description: "앞 절반 뜻 쓰기 + 뒤 절반 철자 쓰기 (순서대로 출제)",
  },
];

export function getVocaQuestionGuide(vocaType) {
  if (vocaType === "spelling") return "다음 뜻에 해당하는 영어 철자를 쓰세요.";
  if (vocaType === "meaning") return "다음 단어의 뜻을 쓰세요.";
  return "";
}

function buildSingleVocaQuestion(entry, vocaType) {
  const word = String(entry.word ?? "").trim();
  const mean = String(entry.mean ?? entry.meaning ?? "").trim();

  if (vocaType === "spelling") {
    return {
      id: createQuestionId(),
      type: "spelling",
      subject: "vocab",
      prompt: mean,
      answer: word,
      options: [],
    };
  }

  return {
    id: createQuestionId(),
    type: "meaning",
    subject: "vocab",
    prompt: word,
    answer: mean,
    options: [],
  };
}

function buildMixVocaQuestions(selectedWords) {
  const count = selectedWords.length;
  const meaningCount = Math.ceil(count / 2);
  const meaningWords = selectedWords.slice(0, meaningCount);
  const spellingWords = selectedWords.slice(meaningCount);

  const meaningQuestions = meaningWords.map((entry) => buildSingleVocaQuestion(entry, "meaning"));
  const spellingQuestions = spellingWords.map((entry) =>
    buildSingleVocaQuestion(entry, "spelling")
  );

  return [...meaningQuestions, ...spellingQuestions];
}

export function buildVocaExamQuestions(words, { examType = "meaning", drawCount } = {}) {
  const pool = ensureUniqueWords(words);
  if (pool.length === 0) return [];

  const requested = Number(drawCount);
  const count =
    Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), pool.length)
      : pool.length;

  const selected = shuffleArray(pool).slice(0, count);

  if (examType === "mix") {
    return buildMixVocaQuestions(selected);
  }

  return selected.map((entry) => buildSingleVocaQuestion(entry, examType));
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

export function getMixExamBreakdown(drawCount) {
  const count = Math.max(0, Math.floor(Number(drawCount) || 0));
  return {
    meaningCount: Math.ceil(count / 2),
    spellingCount: Math.floor(count / 2),
    total: count,
  };
}

/** Mix: 앞 절반 뜻 · 뒤 절반 철자 (배열 순서 기준). 단일 유형은 한 섹션만 */
export function splitVocaExamSections(questions) {
  const list = ensureArray(questions);
  const totalCount = list.length;
  const hasMeaning = list.some((q) => q.type === "meaning");
  const hasSpelling = list.some((q) => q.type === "spelling");
  const isMixExam = hasMeaning && hasSpelling;

  if (isMixExam) {
    const halfIndex = Math.ceil(totalCount / 2);
    return {
      meaningSection: list.slice(0, halfIndex),
      spellingSection: list.slice(halfIndex),
      halfIndex,
      totalCount,
      isMixExam: true,
    };
  }

  if (hasSpelling && !hasMeaning) {
    return {
      meaningSection: [],
      spellingSection: list,
      halfIndex: 0,
      totalCount,
      isMixExam: false,
    };
  }

  return {
    meaningSection: list,
    spellingSection: [],
    halfIndex: totalCount,
    totalCount,
    isMixExam: false,
  };
}
