import { shuffleArray } from "./shuffle";

const HANGUL_ANY =
  /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/u;

/** 붙여넣기 원문 정규화 — BOM, NBSP, 다양한 줄바꿈 통일 */
export function normalizeWritingPasteText(text) {
  return String(text ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2028\u2029\v\f]/g, "\n")
    .replace(/\u00A0/g, " ")
    .trim();
}

/** 줄 단위 공백·번호 접두사 제거 */
export function cleanWritingPasteLine(line) {
  return String(line ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\u200B/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2000-\u200A]/g, " ")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^Q\d+\.\s*/i, "")
    .replace(/^[-*•·▪▫●○◦]\s*/, "")
    .trim();
}

function isSeparatorOnlyLine(line) {
  const cleaned = cleanWritingPasteLine(line);
  if (!cleaned) return true;
  return (
    /^[-–—_=~]{2,}$/u.test(cleaned) ||
    /^[.·…\s]+$/u.test(cleaned) ||
    /^\(\s*빈\s*줄\s*\)$/iu.test(cleaned)
  );
}

function hasKoreanText(text) {
  return HANGUL_ANY.test(String(text ?? ""));
}

/** 붙여넣기 → 유효 줄 배열 (빈 줄·구분선 제외) */
export function extractWritingPasteLines(text) {
  const normalized = normalizeWritingPasteText(text);
  if (!normalized) return [];

  const lines = [];
  for (const rawLine of normalized.split("\n")) {
    const cleaned = cleanWritingPasteLine(rawLine);
    if (isSeparatorOnlyLine(cleaned)) continue;
    lines.push(cleaned);
  }
  return lines;
}

/** 3줄씩 [한글, 기준문장, 모범답안] 세트 */
export function groupWritingLinesIntoTriplets(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const triplets = [];

  for (let index = 0; index + 2 < safeLines.length; index += 3) {
    triplets.push([safeLines[index], safeLines[index + 1], safeLines[index + 2]]);
  }

  return triplets;
}

export function tokenizeSentenceIntoWords(sentence) {
  return String(sentence ?? "")
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^['"([{]+|['"\])},.!?;:]+$/g, "").trim())
    .filter(Boolean);
}

export function shuffleSentenceWords(sentence) {
  const words = tokenizeSentenceIntoWords(sentence);
  if (words.length === 0) return [];
  if (words.length === 1) return [...words];

  const originalKey = words.join("\u0001");
  let shuffled = shuffleArray(words);
  let attempt = 0;

  while (shuffled.join("\u0001") === originalKey && attempt < 12) {
    shuffled = shuffleArray(words);
    attempt += 1;
  }

  return shuffled;
}

/** 쉼표 나열형 주어진 단어 (I, go, school) — 영어 문장과 구분 */
function isLegacyCommaWordList(line) {
  const trimmed = cleanWritingPasteLine(line);
  if (!trimmed.includes(",")) return false;

  const commaParts = trimmed
    .split(",")
    .map((part) => cleanWritingPasteLine(part))
    .filter(Boolean);

  if (commaParts.length < 2) return false;

  if (commaParts.some((part) => /\s/.test(part))) return false;

  return commaParts.every((part) => /^[A-Za-z0-9'’\-]+$/u.test(part));
}

export function buildWritingQuestionFromLines(prompt, referenceLine, answer) {
  const koreanPrompt = cleanWritingPasteLine(prompt);
  const referenceText = cleanWritingPasteLine(referenceLine);
  const modelAnswer = cleanWritingPasteLine(answer);

  if (!koreanPrompt || !referenceText || !modelAnswer) return null;

  if (isLegacyCommaWordList(referenceText)) {
    const legacyWords = referenceText
      .split(",")
      .map((part) => cleanWritingPasteLine(part))
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
  if (scrambledWords.length === 0) return null;

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
  const lines = extractWritingPasteLines(block);
  if (lines.length < 3) return null;
  return buildWritingQuestionFromLines(lines[0], lines[1], lines[2]);
}

/**
 * Writing 붙여넣기 일괄 파싱
 * - \r\n / \n / 빈 줄 / 미세 공백 모두 허용
 * - 비어 있지 않은 줄을 3줄씩 한 문항으로 묶음
 */
export function parseWritingEntries(text) {
  const lines = extractWritingPasteLines(text);
  if (lines.length === 0) {
    return { entries: [], errors: ["입력된 텍스트에서 유효한 줄을 찾지 못했습니다."] };
  }

  const entries = [];
  const errors = [];
  const triplets = groupWritingLinesIntoTriplets(lines);
  const remainder = lines.length % 3;

  if (triplets.length === 0) {
    return {
      entries: [],
      errors: [
        `유효 ${lines.length}줄 — 최소 3줄(한글 뜻 / 기준 문장 / 모범 답안)이 필요합니다.`,
      ],
    };
  }

  if (remainder !== 0) {
    errors.push(
      `입력 ${lines.length}줄 — 3줄 단위로 나누어 떨어지지 않습니다. 마지막 ${remainder}줄을 확인해 주세요.`
    );
  }

  triplets.forEach(([prompt, referenceLine, answer], index) => {
    const parsed = buildWritingQuestionFromLines(prompt, referenceLine, answer);

    if (!parsed) {
      errors.push(
        `${index + 1}번째 영작: 3줄 중 빈 줄이 있거나 기준 문장에서 단어를 추출하지 못했습니다.`
      );
      return;
    }

    if (!hasKoreanText(parsed.prompt)) {
      errors.push(
        `${index + 1}번째 영작: 첫 줄(한글 뜻)에 한글이 없습니다 — "${parsed.prompt.slice(0, 30)}"`
      );
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
  return "Writing: [한글 뜻 / 기준 문장 / 모범 답안] 순으로 3줄씩 입력하세요. 문항 사이 빈 줄은 넣어도 되고 생략해도 됩니다. 줄 앞뒤 공백·Windows 줄바꿈(\\r\\n)도 자동 처리됩니다.";
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
