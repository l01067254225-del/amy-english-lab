import { shuffleArray } from "./shuffle";

const HANGUL = /[\uAC00-\uD7A3]/u;

/** 붙여넣기 텍스트 → 빈 줄(\n+) 무시하고 비어 있지 않은 줄만 추출 */
export function extractWritingPasteLines(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** 비어 있지 않은 줄을 3줄씩 [한글, 기준문장, 모범답안] 세트로 묶음 */
export function groupWritingLinesIntoTriplets(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const triplets = [];

  for (let index = 0; index + 2 < safeLines.length; index += 3) {
    triplets.push([safeLines[index], safeLines[index + 1], safeLines[index + 2]]);
  }

  return triplets;
}

/** 기준 문장을 단어 단위로 분리 (앞뒤 구두점 정리) */
export function tokenizeSentenceIntoWords(sentence) {
  return String(sentence ?? "")
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^['"([{]+|['"\])},.!?;:]+$/g, "").trim())
    .filter(Boolean);
}

/** 기준 문장 단어를 무작위로 섞어 scrambledWords 배열 반환 */
export function shuffleSentenceWords(sentence) {
  const words = tokenizeSentenceIntoWords(sentence);
  if (words.length <= 1) return [...words];

  const originalKey = words.join("\u0001");
  let shuffled = shuffleArray(words);
  let attempt = 0;

  while (shuffled.join("\u0001") === originalKey && attempt < 8) {
    shuffled = shuffleArray(words);
    attempt += 1;
  }

  return shuffled;
}

function isLegacyCommaWordList(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.includes(",")) return false;

  const commaParts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (commaParts.length < 2) return false;

  const spaceWordCount = tokenizeSentenceIntoWords(trimmed).length;
  return spaceWordCount <= commaParts.length;
}

/** 3줄 → Writing 문항 객체 (prompt / givenWords·scrambledWords / answer) */
export function buildWritingQuestionFromLines(prompt, referenceLine, answer) {
  const koreanPrompt = String(prompt ?? "").trim();
  const referenceText = String(referenceLine ?? "").trim();
  const modelAnswer = String(answer ?? "").trim();

  if (!koreanPrompt || !referenceText || !modelAnswer) return null;

  if (isLegacyCommaWordList(referenceText)) {
    const legacyWords = referenceText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      subject: "writing",
      type: "writing",
      prompt: koreanPrompt,
      referenceSentence: "",
      scrambledWords: legacyWords,
      givenWords: legacyWords.join(", "),
      answer: modelAnswer,
    };
  }

  const scrambledWords = shuffleSentenceWords(referenceText);

  return {
    subject: "writing",
    type: "writing",
    prompt: koreanPrompt,
    referenceSentence: referenceText,
    scrambledWords,
    givenWords: scrambledWords.join(", "),
    answer: modelAnswer,
  };
}

export function parseWritingBlock(block) {
  const lines = String(block ?? "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  return buildWritingQuestionFromLines(lines[0], lines[1], lines[2]);
}

/**
 * Writing 붙여넣기 일괄 파싱
 * - 빈 줄 유무와 관계없이 비어 있지 않은 줄을 3줄씩 한 문항으로 묶음
 */
export function parseWritingEntries(text) {
  const lines = extractWritingPasteLines(text);
  if (lines.length === 0) return { entries: [], errors: [] };

  const entries = [];
  const errors = [];
  const triplets = groupWritingLinesIntoTriplets(lines);
  const remainder = lines.length % 3;

  if (remainder !== 0) {
    errors.push(
      `입력 ${lines.length}줄 — 3줄 단위로 나누어 떨어지지 않습니다. 마지막 ${remainder}줄을 확인해 주세요.`
    );
  }

  triplets.forEach(([prompt, referenceLine, answer], index) => {
    const parsed = buildWritingQuestionFromLines(prompt, referenceLine, answer);

    if (!parsed) {
      errors.push(
        `${index + 1}번째 영작: 한글 뜻 · 기준 문장 · 모범 답안 3줄 형식을 인식하지 못했습니다.`
      );
      return;
    }

    if (!HANGUL.test(parsed.prompt)) {
      errors.push(`${index + 1}번째 영작: 첫 줄은 한글 뜻(문제)이어야 합니다.`);
      return;
    }

    entries.push(parsed);
  });

  return { entries, errors };
}

export function getWritingPasteExample() {
  return `그녀는 해안을 따라 차를 몰았다.
She drove along the coast.
She drove along the coast.

나는 오늘 아침 식사를 걸렀다.
I skipped breakfast today.
I skipped breakfast today.

첫 페이지는 건너뛰자.
Let's skip the first page.
Let's skip the first page.`;
}

export function getWritingPasteHint() {
  return "Writing: [한글 뜻 / 기준 문장 / 모범 답안] 순으로 3줄씩 입력하세요. 문항 사이 빈 줄은 넣어도 되고 생략해도 됩니다. 기준 문장 단어가 섞여 '주어진 단어'로 저장됩니다.";
}

export function formatScrambledWordsForDisplay(scrambledWords) {
  return ensureWordArray(scrambledWords).join(", ");
}

export function ensureWordArray(value) {
  if (Array.isArray(value)) {
    return value.map((word) => String(word ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);
  }
  return [];
}
