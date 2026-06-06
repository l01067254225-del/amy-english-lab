import { shuffleArray } from "./shuffle";

const NUMBER_PREFIX = /^\d+[.)]\s*/;

function cleanVocabLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    .trim()
    .replace(NUMBER_PREFIX, "")
    .trim();
}

export function parseVocabLine(line) {
  const text = cleanVocabLine(line);
  if (!text) return null;

  const meaningLabelMatch = text.match(/^(.+?)\s+뜻\s*[:：]\s*(.+)$/iu);
  if (meaningLabelMatch) {
    const word = meaningLabelMatch[1].trim();
    const meaning = meaningLabelMatch[2].trim();
    if (word && meaning) return { word, meaning };
  }

  const separatorMatch = text.match(/^(.+?)\s*[:：\-–—]\s*(.+)$/u);
  if (separatorMatch) {
    const word = separatorMatch[1].trim();
    const meaning = separatorMatch[2].trim();
    if (word && meaning) return { word, meaning };
  }

  const tabParts = text.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    return { word: tabParts[0], meaning: tabParts.slice(1).join(" ").trim() };
  }

  const multiSpaceParts = text.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (multiSpaceParts.length >= 2) {
    return { word: multiSpaceParts[0], meaning: multiSpaceParts.slice(1).join(" ").trim() };
  }

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
      errors.push(`${index + 1}번째 줄: 단어/뜻 형식을 인식하지 못했습니다.`);
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
  return `1. dynamic : 역동적인, 활발한
dynamic - 역동적인, 활발한
adaptable 뜻: 적응력 있는
resilient : 회복력 있는
4. curious - 호기심 많은`;
}

export function getVocabPasteHint(questionType = "subjective") {
  if (questionType === "objective") {
    return "Voca: 한 줄에 '영어단어 : 한글뜻' 형식으로 입력하세요. 객관식은 정답 뜻 + 다른 단어 뜻 4개로 5지선다가 자동 생성됩니다.";
  }
  return "Voca: 한 줄에 '영어단어 : 한글뜻' 형식으로 입력하세요. 번호·뜻:·하이픈(-) 등 다양한 구분 기호를 인식합니다.";
}
