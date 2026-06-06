import { shuffleArray } from "./shuffle";

const NUMBER_PREFIX = /^\d+[.)]?\s*/u;
const NUMBER_STUCK_PREFIX = /^\d+(?=[A-Za-z])/u;
const ENGLISH_WORD_HEAD = /^([A-Za-z][A-Za-z'\-]*)/u;
const HANGUL = /[\uAC00-\uD7A3]/u;

function cleanVocabLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    .trim()
    .replace(NUMBER_PREFIX, "")
    .replace(NUMBER_STUCK_PREFIX, "")
    .trim();
}

function normalizeMeaningTail(meaning) {
  return String(meaning ?? "")
    .trim()
    .replace(/^뜻\s*[:：]\s*/iu, "")
    .replace(/^[:：\-–—]\s*/u, "")
    .trim();
}

function isValidPair(word, meaning) {
  return Boolean(
    word &&
    meaning &&
    ENGLISH_WORD_HEAD.test(word) &&
    word.match(ENGLISH_WORD_HEAD)?.[0] === word &&
    HANGUL.test(meaning)
  );
}

function splitByLeadingEnglishWord(text) {
  const trimmed = String(text ?? "").trim();
  const match = trimmed.match(/^([A-Za-z][A-Za-z'\-]*)\s*(.*)$/u);
  if (!match) return null;

  const word = match[1].trim();
  const meaning = normalizeMeaningTail(match[2]);
  if (!isValidPair(word, meaning)) return null;

  return { word, meaning };
}

function splitDelimitedParts(parts) {
  const first = String(parts[0] ?? "").trim();
  const wordMatch = first.match(ENGLISH_WORD_HEAD);
  if (!wordMatch) return null;

  const word = wordMatch[0];
  const inlineTail = normalizeMeaningTail(first.slice(word.length));
  const joinedTail = normalizeMeaningTail(
    [inlineTail, ...parts.slice(1)].filter(Boolean).join(" ")
  );

  if (!isValidPair(word, joinedTail)) return null;
  return { word, meaning: joinedTail };
}

export function parseVocabLine(line) {
  const text = cleanVocabLine(line);
  if (!text) return null;

  const tabParts = text.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    const tabPair = splitDelimitedParts(tabParts);
    if (tabPair) return tabPair;
  }

  const multiSpaceParts = text.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (multiSpaceParts.length >= 2) {
    const spacedPair = splitDelimitedParts(multiSpaceParts);
    if (spacedPair) return spacedPair;
  }

  return splitByLeadingEnglishWord(text);
}

export function parseVocabEntries(text) {
  const lines = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];
  const errors = [];

  lines.forEach((line, index) => {
    const parsed = parseVocabLine(line);
    if (!parsed) {
      errors.push(`${index + 1}번째 줄: 단어/뜻 형식을 인식하지 못했습니다. (${line.slice(0, 40)})`);
      return;
    }
    entries.push({ word: parsed.word, meaning: parsed.meaning });
  });

  return { entries, errors };
}

function buildMcqOptions(correctMeaning, otherMeanings) {
  const pool = [...new Set(otherMeanings.filter((meaning) => meaning && meaning !== correctMeaning))];
  const wrongChoices = shuffleArray(pool).slice(0, 4);

  while (wrongChoices.length < 4) {
    wrongChoices.push(`보기 ${wrongChoices.length + 1}`);
  }

  const options = shuffleArray([correctMeaning, ...wrongChoices.slice(0, 4)]);
  const answerIndex = options.findIndex((option) => option === correctMeaning) + 1;

  return {
    options,
    answer: String(answerIndex),
  };
}

export function buildVocabQuestionItems(entries, { questionType = "subjective", level = "" } = {}) {
  const allMeanings = entries.map((entry) => entry.meaning);
  const items = [];

  entries.forEach((entry) => {
    if (questionType === "objective") {
      const { options, answer } = buildMcqOptions(
        entry.meaning,
        allMeanings.filter((meaning) => meaning !== entry.meaning)
      );
      items.push({
        type: "objective",
        subject: "vocab",
        level,
        prompt: entry.word,
        answer,
        options,
      });
      return;
    }

    items.push({
      type: "subjective",
      subject: "vocab",
      level,
      prompt: `다음 단어의 뜻을 쓰세요: ${entry.word}`,
      answer: entry.meaning,
      options: [],
    });
  });

  return items;
}

export function parseVocabQuestionText(text, { questionType = "subjective", level = "" } = {}) {
  const { entries, errors } = parseVocabEntries(text);

  if (entries.length === 0) {
    return { items: [], errors };
  }

  const items = buildVocabQuestionItems(entries, { questionType, level });
  return { items, errors };
}

export function getVocabPasteExample() {
  return `1 boost밀어올리다
5 decode (암호룰) 해독하다
decode(암호룰) 해독하다
dynamic : 역동적인, 활발한
adaptable - 적응력 있는
52 resilient  (회복) 탄력 있는`;
}

export function getVocabPasteHint() {
  return "Voca: 맨 앞 영어 단어 뒤의 괄호·한글·기호 전체가 뜻으로 저장됩니다. 예) decode (암호룰) 해독하다 → decode / (암호룰) 해독하다";
}
