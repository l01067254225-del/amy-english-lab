import { shuffleArray } from "./shuffle";

const HANGUL_ANY =
  /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/u;

export const WRITING_DEFAULT_PROMPT = "(한글 뜻 미입력)";

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

function countChars(text, pattern) {
  const matches = String(text ?? "").match(pattern);
  return matches ? matches.length : 0;
}

/** 줄 역할: korean | english | mixed | unknown | empty */
export function classifyWritingLine(line) {
  const cleaned = cleanWritingPasteLine(line);
  if (!cleaned || isSeparatorOnlyLine(cleaned)) return "empty";

  const hangulCount = countChars(cleaned, HANGUL_ANY);
  const latinCount = countChars(cleaned, /[A-Za-z]/g);

  if (hangulCount > 0 && latinCount === 0) return "korean";
  if (hangulCount > 0 && latinCount > 0) {
    if (/^[\uAC00-\uD7A3]/.test(cleaned) || hangulCount >= latinCount) {
      return "korean";
    }
    return "mixed";
  }
  if (latinCount > 0) return "english";
  return "unknown";
}

export function isPrimarilyEnglishLine(line) {
  const kind = classifyWritingLine(line);
  return kind === "english" || kind === "mixed";
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

/**
 * 빈 줄 기준 문항 블록 분리 (정규식)
 * 문항 사이 1줄 이상 공백·탭만 있는 줄은 구분자로 처리
 */
export function splitWritingPasteBlocks(text) {
  const normalized = normalizeWritingPasteText(text);
  if (!normalized) return [];

  return normalized
    .split(/\n[ \t]*\n+/u)
    .map((block) => extractWritingPasteLines(block))
    .filter((lines) => lines.length > 0);
}

/** @deprecated — 호환용. 스트림/블록 파서 사용 권장 */
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

  if (!referenceText && !modelAnswer) return null;

  const resolvedPrompt = koreanPrompt || WRITING_DEFAULT_PROMPT;
  const resolvedReference = referenceText || modelAnswer;
  const resolvedAnswer = modelAnswer || referenceText;

  if (!resolvedReference || !resolvedAnswer) return null;

  if (isLegacyCommaWordList(resolvedReference)) {
    const legacyWords = resolvedReference
      .split(",")
      .map((part) => cleanWritingPasteLine(part))
      .filter(Boolean);

    return {
      subject: "writing",
      type: "writing",
      prompt: resolvedPrompt,
      referenceSentence: "",
      scrambledWords: legacyWords,
      givenWords: legacyWords.join(", "),
      answer: resolvedAnswer,
    };
  }

  const scrambledWords = shuffleSentenceWords(resolvedReference);
  if (scrambledWords.length === 0) return null;

  return {
    subject: "writing",
    type: "writing",
    prompt: resolvedPrompt,
    referenceSentence: resolvedReference,
    scrambledWords,
    givenWords: scrambledWords.join(", "),
    answer: resolvedAnswer,
  };
}

function tryBuildWritingEntry(prompt, reference, answer, { label = "문항" } = {}) {
  try {
    const entry = buildWritingQuestionFromLines(prompt, reference, answer);
    if (!entry) {
      return {
        entry: null,
        error: `${label}: 기준 문장에서 단어를 추출하지 못해 건너뜁니다.`,
      };
    }

    const warnings = [];
    const cleanedPrompt = cleanWritingPasteLine(prompt);
    if (!cleanedPrompt) {
      warnings.push(`${label}: 한글 뜻 없음 — "${WRITING_DEFAULT_PROMPT}" 사용`);
    } else if (!hasKoreanText(cleanedPrompt)) {
      warnings.push(
        `${label}: 첫 줄에 한글이 없어 그대로 저장 — "${cleanedPrompt.slice(0, 28)}"`
      );
    }

    return { entry, error: null, warnings };
  } catch (error) {
    return {
      entry: null,
      error: `${label}: 처리 오류 — ${error?.message ?? "알 수 없음"}`,
    };
  }
}

/** 3줄 블록 — 순서가 어긋나도 역할 기반으로 복원 */
export function resolveWritingThreeLines(lineA, lineB, lineC, blockLabel = "문항") {
  const lines = [lineA, lineB, lineC].map(cleanWritingPasteLine);
  const kinds = lines.map(classifyWritingLine);

  const koreanIndex = kinds.findIndex((kind) => kind === "korean");
  const englishLines = lines.filter(
    (_, index) => kinds[index] === "english" || kinds[index] === "mixed"
  );

  if (koreanIndex >= 0 && englishLines.length >= 2) {
    return tryBuildWritingEntry(
      lines[koreanIndex],
      englishLines[0],
      englishLines[1],
      { label: blockLabel }
    );
  }

  if (koreanIndex >= 0 && englishLines.length === 1) {
    return tryBuildWritingEntry(
      lines[koreanIndex],
      englishLines[0],
      englishLines[0],
      { label: blockLabel }
    );
  }

  if (koreanIndex === -1 && englishLines.length >= 2) {
    const result = tryBuildWritingEntry(
      WRITING_DEFAULT_PROMPT,
      englishLines[0],
      englishLines[1],
      { label: blockLabel }
    );
    if (result.entry) {
      const extra = englishLines.length - 2;
      result.warnings = [
        ...(result.warnings ?? []),
        `${blockLabel}: 한글 뜻 줄 누락 — "${WRITING_DEFAULT_PROMPT}" 사용`,
        ...(extra > 0
          ? [`${blockLabel}: 영어 ${extra}줄 초과 — 앞 2줄만 사용`]
          : []),
      ];
    }
    return result;
  }

  if (koreanIndex === 1 && kinds[0] === "english" && kinds[2] === "english") {
    return tryBuildWritingEntry(lines[1], lines[0], lines[2], { label: blockLabel });
  }

  const prompt =
    kinds[0] === "korean" ? lines[0] : kinds[1] === "korean" ? lines[1] : WRITING_DEFAULT_PROMPT;
  const reference = englishLines[0] ?? lines.find((line) => cleanWritingPasteLine(line)) ?? "";
  const answer =
    englishLines[1] ?? englishLines[0] ?? lines[lines.length - 1] ?? "";

  return tryBuildWritingEntry(prompt, reference, answer, { label: blockLabel });
}

/** 2줄 블록 — [한글+영어] 또는 [영어+영어] */
export function resolveWritingTwoLines(lineA, lineB, blockLabel = "문항") {
  const a = cleanWritingPasteLine(lineA);
  const b = cleanWritingPasteLine(lineB);
  const kindA = classifyWritingLine(a);
  const kindB = classifyWritingLine(b);

  if (kindA === "korean" && (kindB === "english" || kindB === "mixed")) {
    return tryBuildWritingEntry(a, b, b, { label: blockLabel });
  }

  if (kindB === "korean" && (kindA === "english" || kindA === "mixed")) {
    return tryBuildWritingEntry(b, a, a, { label: blockLabel });
  }

  if (
    (kindA === "english" || kindA === "mixed") &&
    (kindB === "english" || kindB === "mixed")
  ) {
    const result = tryBuildWritingEntry(WRITING_DEFAULT_PROMPT, a, b, { label: blockLabel });
    if (result.entry) {
      result.warnings = [
        ...(result.warnings ?? []),
        `${blockLabel}: 한글 뜻 줄 누락 — "${WRITING_DEFAULT_PROMPT}" 사용`,
      ];
    }
    return result;
  }

  return tryBuildWritingEntry(a || WRITING_DEFAULT_PROMPT, b || a, b || a, {
    label: blockLabel,
  });
}

/**
 * 연속 줄 스트림 파서
 * 한글 줄 = 새 문항 시작, 영어 2줄 = 기준문장+정답 완성
 */
export function parseWritingLineStream(lines) {
  const entries = [];
  const errors = [];
  let prompt = null;
  let reference = null;
  let answer = null;
  let itemNumber = 0;

  const resetBuffer = () => {
    prompt = null;
    reference = null;
    answer = null;
  };

  const commitEntry = (reason = "") => {
    if (!reference && !answer) {
      resetBuffer();
      return;
    }

    itemNumber += 1;
    const label = `${itemNumber}번째`;

    if (reference && answer) {
      const result = tryBuildWritingEntry(
        prompt || WRITING_DEFAULT_PROMPT,
        reference,
        answer,
        { label }
      );
      if (result.entry) entries.push(result.entry);
      if (result.error) errors.push(result.error);
      if (result.warnings?.length) errors.push(...result.warnings);
      if (!prompt && result.entry) {
        errors.push(`${label}: 한글 뜻 누락 — "${WRITING_DEFAULT_PROMPT}" 사용`);
      }
    } else {
      const preview = [prompt, reference, answer]
        .filter(Boolean)
        .map((part) => part.slice(0, 24))
        .join(" / ");
      errors.push(
        `${label} 건너뜀${reason ? ` (${reason})` : ""}: ${preview || "불완전한 줄"}`
      );
    }

    resetBuffer();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const kind = classifyWritingLine(line);

    try {
      if (kind === "empty") continue;

      if (kind === "korean") {
        if (reference && answer) {
          commitEntry("새 한글 줄");
          prompt = line;
        } else if (reference && !answer) {
          errors.push(`${index + 1}줄: 한글 줄 앞 영어 1줄만 있어 건너뜀`);
          resetBuffer();
          prompt = line;
        } else if (prompt && !reference) {
          errors.push(`${index + 1}줄: 한글 줄 연속 — 이전 줄만 사용`);
          prompt = line;
        } else {
          prompt = line;
        }
        continue;
      }

      if (kind === "english" || kind === "mixed") {
        if (!reference) {
          reference = line;
        } else if (!answer) {
          answer = line;
          commitEntry("2줄 영어 완성");
        } else {
          commitEntry("다음 문항(한글 없음)");
          reference = line;
        }
        continue;
      }

      errors.push(`${index + 1}줄: 인식 불가 — "${line.slice(0, 30)}"`);
    } catch (error) {
      errors.push(`${index + 1}줄 처리 오류: ${error?.message ?? "알 수 없음"}`);
      resetBuffer();
    }
  }

  if (reference && answer) {
    commitEntry("마지막 문항");
  } else if (prompt || reference) {
    errors.push("마지막 문항: 줄이 부족해 건너뜀");
  }

  return { entries, errors };
}

/** 단일 블록(빈 줄로 구분된 덩어리) 파싱 */
export function parseWritingBlockLines(lines, blockNumber = 1) {
  const blockLabel = `${blockNumber}번째 블록`;

  try {
    if (!Array.isArray(lines) || lines.length === 0) {
      return { entries: [], errors: [] };
    }

    if (lines.length === 1) {
      return {
        entries: [],
        errors: [`${blockLabel}: 줄 1개만 있어 건너뜁니다.`],
      };
    }

    if (lines.length === 2) {
      const result = resolveWritingTwoLines(lines[0], lines[1], blockLabel);
      return {
        entries: result.entry ? [result.entry] : [],
        errors: [result.error, ...(result.warnings ?? [])].filter(Boolean),
      };
    }

    if (lines.length === 3) {
      const result = resolveWritingThreeLines(
        lines[0],
        lines[1],
        lines[2],
        blockLabel
      );
      return {
        entries: result.entry ? [result.entry] : [],
        errors: [result.error, ...(result.warnings ?? [])].filter(Boolean),
      };
    }

    return parseWritingLineStream(lines);
  } catch (error) {
    return {
      entries: [],
      errors: [`${blockLabel} 분석 오류: ${error?.message ?? "알 수 없음"}`],
    };
  }
}

export function parseWritingBlock(block) {
  const { entries } = parseWritingBlockLines(extractWritingPasteLines(block), 1);
  return entries[0] ?? null;
}

/**
 * Writing 붙여넣기 일괄 파싱
 * - 빈 줄로 문항 블록 분리 (정규식)
 * - 줄 누락·순서 밀림 시 역할 기반 복구 또는 해당 문항만 skip
 * - 정상 문항은 errors가 있어도 entries에 포함
 */
export function parseWritingEntries(text) {
  try {
    const allLines = extractWritingPasteLines(text);
    if (allLines.length === 0) {
      return {
        entries: [],
        errors: ["입력된 텍스트에서 유효한 줄을 찾지 못했습니다."],
      };
    }

    const blocks = splitWritingPasteBlocks(text);
    const entries = [];
    const errors = [];

    if (blocks.length > 1) {
      blocks.forEach((blockLines, index) => {
        const result = parseWritingBlockLines(blockLines, index + 1);
        entries.push(...result.entries);
        errors.push(...result.errors);
      });
      return { entries, errors };
    }

    const singleBlock = blocks[0] ?? allLines;

    if (singleBlock.length <= 3) {
      return parseWritingBlockLines(singleBlock, 1);
    }

    return parseWritingLineStream(singleBlock);
  } catch (error) {
    return {
      entries: [],
      errors: [`텍스트 분석 중 오류: ${error?.message ?? "알 수 없음"}`],
    };
  }
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
  return "Writing: [한글 뜻 / 기준 문장 / 모범 답안] 순으로 3줄씩 입력하세요. 문항 사이 빈 줄은 선택입니다. 한글 누락·줄 밀림이 있어도 인식 가능한 문항은 등록되며, 문제 있는 문항만 건너뜁니다.";
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
