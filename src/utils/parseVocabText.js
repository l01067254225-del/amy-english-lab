import { shuffleArray } from "./shuffle";

const NUMBER_PREFIX = /^\d+(?:[.)]\s*|\s+)/u;
const NUMBER_STUCK_PREFIX = /^\d+(?=[A-Za-z])/u;
const HANGUL = /[\uAC00-\uD7A3]/u;
const LATIN = /[A-Za-z]/;

function cleanVocabLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    .trim()
    .replace(NUMBER_PREFIX, "")
    .replace(NUMBER_STUCK_PREFIX, "")
    .trim();
}

function normalizeWord(word) {
  return String(word ?? "")
    .trim()
    .replace(/[:：\-–—]+$/u, "")
    .trim();
}

function normalizeMeaning(meaning) {
  return String(meaning ?? "").trim();
}

function isValidPair(word, meaning) {
  return Boolean(word && meaning && LATIN.test(word) && HANGUL.test(meaning));
}

function splitAtLatinHangulBoundary(text) {
  const match = text.match(/^(.+?)([\uAC00-\uD7A3][\s\S]*)$/u);
  if (!match) return null;

  const word = normalizeWord(match[1]);
  const meaning = normalizeMeaning(match[2]);
  if (!isValidPair(word, meaning) || !/[A-Za-z]$/.test(word)) return null;

  return { word, meaning };
}

function splitEnglishKoreanBySingleSpace(text) {
  const match = text.match(/^([A-Za-z][A-Za-z\s'\-]*?)\s+([\uAC00-\uD7A3].*)$/u);
  if (!match) return null;

  const word = normalizeWord(match[1]);
  const meaning = normalizeMeaning(match[2]);
  if (!isValidPair(word, meaning)) return null;

  return { word, meaning };
}

export function parseVocabLine(line) {
  const text = cleanVocabLine(line);
  if (!text) return null;

  const meaningLabelMatch = text.match(/^(.+?)\s+뜻\s*[:：]\s*(.+)$/iu);
  if (meaningLabelMatch) {
    const word = normalizeWord(meaningLabelMatch[1]);
    const meaning = normalizeMeaning(meaningLabelMatch[2]);
    if (isValidPair(word, meaning)) return { word, meaning };
  }

  const separatorMatch = text.match(/^(.+?)\s*[:：\-–—]\s*(.+)$/u);
  if (separatorMatch) {
    const word = normalizeWord(separatorMatch[1]);
    const meaning = normalizeMeaning(separatorMatch[2]);
    if (isValidPair(word, meaning)) return { word, meaning };
  }

  const tabParts = text.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    const word = normalizeWord(tabParts[0]);
    const meaning = normalizeMeaning(tabParts.slice(1).join(" "));
    if (isValidPair(word, meaning)) return { word, meaning };
  }

  const multiSpaceParts = text.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (multiSpaceParts.length >= 2) {
    const word = normalizeWord(multiSpaceParts[0]);
    const meaning = normalizeMeaning(multiSpaceParts.slice(1).join(" "));
    if (isValidPair(word, meaning)) return { word, meaning };
  }

  const boundaryPair = splitAtLatinHangulBoundary(text);
  if (boundaryPair) return boundaryPair;

  const spacedPair = splitEnglishKoreanBySingleSpace(text);
  if (spacedPair) return spacedPair;

  return null;
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
    entries.push(parsed);
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
chaos혼돈
dynamic : 역동적인, 활발한
adaptable - 적응력 있는
resilient  회복력 있는
5. curious 뜻: 호기심 많은`;
}

export function getVocabPasteHint(questionType = "subjective") {
  if (questionType === "objective") {
    return "Voca: '영어단어+한글뜻'(공백·기호 없음), '단어 : 뜻', '단어 - 뜻' 등 다양한 형식을 인식합니다. 객관식은 5지선다가 자동 생성됩니다.";
  }
  return "Voca: 'boost밀어올리다'처럼 붙어 있어도, ': · - · 뜻:' 등 구분 기호가 있어도 자동 분리됩니다. 줄마다 한 단어씩 입력하세요.";
}
