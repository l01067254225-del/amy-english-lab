import { shuffleArray } from "./shuffle";

const HANGUL = /[\uAC00-\uD7A3]/u;

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

function buildWritingQuestionFromLines(prompt, referenceLine, answer) {
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
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const prompt = lines[0];
  const referenceLine = lines[1];
  const answer = lines.slice(2).join(" ");

  return buildWritingQuestionFromLines(prompt, referenceLine, answer);
}

export function parseWritingEntries(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return { entries: [], errors: [] };

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const entries = [];
  const errors = [];

  const candidates =
    blocks.length > 1
      ? blocks
      : (() => {
          const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
          const grouped = [];
          for (let index = 0; index + 2 < lines.length; index += 3) {
            grouped.push(lines.slice(index, index + 3).join("\n"));
          }
          return grouped.length > 0 ? grouped : [normalized];
        })();

  candidates.forEach((block, index) => {
    const parsed = parseWritingBlock(block);
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
  return `나는 매일 학교에 간다.
I go to school every day.
I go to school every day.

그는 어제 도서관에서 책을 읽었다.
He read a book at the library yesterday.
He read a book at the library yesterday.`;
}

export function getWritingPasteHint() {
  return "Writing: 문항마다 [한글 뜻 / 기준 문장 / 모범 답안] 3줄씩 입력하세요. 기준 문장의 단어가 무작위로 섞여 시험지 힌트로 제공됩니다. 빈 줄로 문항을 구분할 수 있습니다.";
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
