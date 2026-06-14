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

function toNumberedItems(questions, startNumber) {
  return ensureArray(questions).map((question, index) => ({
    question,
    number: startNumber + index,
  }));
}

const HANGUL_CHAR = /[\uAC00-\uD7A3]/u;
const LATIN_CHAR = /[A-Za-z]/u;

function extractKoreanOnly(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";

  const hangulIndex = source.search(HANGUL_CHAR);
  if (hangulIndex === -1) return source;

  return source.slice(hangulIndex).trim();
}

function extractEnglishOnly(text) {
  const source = String(text ?? "").trim();
  if (!source) return "";

  const hangulIndex = source.search(HANGUL_CHAR);
  if (hangulIndex === -1) return source;

  return source.slice(0, hangulIndex).trim();
}

function readMeaningField(question) {
  return String(
    question?.meaning ?? question?.mean ?? question?.korean ?? question?.definition ?? ""
  ).trim();
}

function readWordField(question) {
  return String(
    question?.word ?? question?.english ?? question?.spelling ?? question?.voca ?? ""
  ).trim();
}

/** 뜻 쓰기 — 문제 제목: 영어만 */
export function resolveVocaMeaningPrompt(question) {
  const word = readWordField(question);
  if (word && !HANGUL_CHAR.test(word)) {
    return word;
  }

  const raw = String(question?.prompt ?? question?.text ?? "").trim();
  const englishOnly = extractEnglishOnly(raw);
  if (englishOnly && LATIN_CHAR.test(englishOnly)) {
    return englishOnly;
  }

  return raw;
}

/** 철자 쓰기 — 문제 제목: 한글 뜻만 (영어 철자·숙어 노출 금지) */
export function resolveVocaSpellingPrompt(question) {
  const meaning = readMeaningField(question);
  if (meaning) {
    const koreanOnly = extractKoreanOnly(meaning);
    if (koreanOnly && HANGUL_CHAR.test(koreanOnly)) {
      return koreanOnly;
    }
  }

  const raw = String(question?.prompt ?? question?.text ?? "").trim();
  const koreanOnly = extractKoreanOnly(raw);
  if (koreanOnly && HANGUL_CHAR.test(koreanOnly)) {
    return koreanOnly;
  }

  return raw;
}

function isVocaSpellingQuestion(question) {
  return question?.type === "spelling";
}

/**
 * type 기준 분류
 * - meaning: 영어 단어(prompt) → 한글 뜻 입력
 * - spelling: 한글 뜻(prompt) → 영어 철자 입력
 */
export function splitVocaExamSections(questions) {
  const list = ensureArray(questions);
  const meaningQuestions = [];
  const spellingQuestions = [];

  list.forEach((question) => {
    if (isVocaSpellingQuestion(question)) {
      spellingQuestions.push(question);
      return;
    }
    meaningQuestions.push(question);
  });

  const meaningCount = meaningQuestions.length;
  const spellingCount = spellingQuestions.length;
  const totalCount = list.length;
  const isMixExam = meaningCount > 0 && spellingCount > 0;

  return {
    meaning: toNumberedItems(meaningQuestions, 1),
    spelling: toNumberedItems(spellingQuestions, meaningCount + 1),
    meaningRange: meaningCount > 0 ? `1-${meaningCount}` : "",
    spellingRange:
      spellingCount > 0 ? `${meaningCount + 1}-${totalCount}` : "",
    halfIndex: meaningCount,
    totalCount,
    isMixExam,
  };
}
