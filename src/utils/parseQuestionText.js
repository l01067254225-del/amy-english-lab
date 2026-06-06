import { resolveSubject } from "./parseQuestionCsvHelpers";
import { createPassageId } from "./readingPassage";

const CIRCLED_NUMBERS = "①②③④⑤";
const OPTION_LINE =
  /^(?:보기\s*)?(?:[①②③④⑤]|[1-5][.)．、:：\)]\s*|\([1-5]\))\s*(.+)$/u;
const QUESTION_LINE = /^(?:문제|Q|Question)\s*[:：]?\s*(.+)$/iu;
const NUMBERED_QUESTION = /^(\d+)\.\s*(.+)$/;
const ANSWER_KEYWORD = /정답\s*[:：]/i;
const ANSWER_KEYWORD_SPLIT = /([\s\S]*?)\n?\s*정답\s*[:：]\s*([\s\S]*)$/i;

/** [지문] ~ [/지문] only — inner [ ] never act as delimiters */
const PASSAGE_BLOCK_REGEX = /\[지문\]\s*([\s\S]*?)\[\/지문\]/i;
const PASSAGE_OPEN_TAG = /^\s*\[지문\]\s*/i;

export function preservePassageText(text) {
  return String(text ?? "").replace(/^\s+/, "").replace(/\s+$/, "");
}

function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n");
}

function findFirstNumberedQuestionIndex(text) {
  const lines = text.split("\n");
  return lines.findIndex((line) => NUMBERED_QUESTION.test(line.trim()));
}

export function extractReadingPassage(text) {
  const source = normalizeNewlines(text);
  if (!source.trim()) {
    return { readingPassage: "", remainder: "", matched: false };
  }

  const closedMatch = source.match(PASSAGE_BLOCK_REGEX);
  if (closedMatch) {
    const readingPassage = preservePassageText(closedMatch[1]);
    const remainder = source.slice(closedMatch.index + closedMatch[0].length).trim();
    return { readingPassage, remainder, matched: Boolean(readingPassage) };
  }

  const openMatch = source.match(PASSAGE_OPEN_TAG);
  if (openMatch) {
    const afterTag = source.slice(openMatch.index + openMatch[0].length);
    const questionIdx = findFirstNumberedQuestionIndex(afterTag);
    const passageSlice =
      questionIdx > 0 ? afterTag.slice(0, questionIdx) : afterTag;
    const readingPassage = preservePassageText(passageSlice);
    const remainder =
      questionIdx > 0 ? afterTag.slice(questionIdx).trim() : "";

    return {
      readingPassage,
      remainder: remainder || source.slice(openMatch.index + openMatch[0].length).trim(),
      matched: Boolean(readingPassage),
      partialTag: true,
    };
  }

  return { readingPassage: "", remainder: source.trim(), matched: false };
}

function normalizeAnswerToken(token) {
  const value = String(token ?? "").trim();
  const circledIndex = CIRCLED_NUMBERS.indexOf(value);
  if (circledIndex >= 0) return String(circledIndex + 1);
  const matched = value.match(/^[①②③④⑤1-5]/);
  if (matched) {
    const ch = matched[0];
    const idx = CIRCLED_NUMBERS.indexOf(ch);
    if (idx >= 0) return String(idx + 1);
    return ch.replace(/\D/g, "") || value;
  }
  return value;
}

export function splitQuestionBlocks(text) {
  const normalized = normalizeNewlines(text).trim();
  if (!normalized) return [];

  const byNumber = normalized
    .split(/\n(?=\d+\.\s)/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (byNumber.length > 1) return byNumber;

  const byBlank = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (byBlank.length > 1) return byBlank;

  return [normalized];
}

function splitBodyAndAnswer(block) {
  const trimmed = block.trim();
  if (!trimmed) return { body: "", answer: "" };

  const match = trimmed.match(ANSWER_KEYWORD_SPLIT);
  if (match) {
    return {
      body: match[1].trim(),
      answer: match[2].trim(),
    };
  }

  const lines = trimmed.split("\n");
  const answerLineIdx = lines.findIndex((line) => ANSWER_KEYWORD.test(line));
  if (answerLineIdx >= 0) {
    const body = lines.slice(0, answerLineIdx).join("\n").trim();
    const answer = lines
      .slice(answerLineIdx)
      .join("\n")
      .replace(ANSWER_KEYWORD, "")
      .trim();
    return { body, answer };
  }

  return { body: trimmed, answer: "" };
}

function parseBlock(block, defaultSubject, readingContext = null) {
  const { body, answer: answerSection } = splitBodyAndAnswer(block);
  if (!body && !answerSection) return null;

  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 && answerSection) {
    lines.push(answerSection.split("\n")[0]?.trim() || "본문");
  }

  let prompt = "";
  let subject = readingContext?.subject ?? defaultSubject;
  const options = [];
  const promptLines = [];

  lines.forEach((line) => {
    const questionMatch = line.match(QUESTION_LINE);
    if (questionMatch) {
      prompt = questionMatch[1].trim();
      return;
    }

    const optionMatch = line.match(OPTION_LINE);
    if (optionMatch) {
      options.push(optionMatch[1].trim());
      return;
    }

    const subjectMatch = line.match(/^(?:과목|Subject)\s*[:：]\s*(.+)$/iu);
    if (subjectMatch) {
      subject = resolveSubject(subjectMatch[1]);
      return;
    }

    const numberedQuestion = line.match(NUMBERED_QUESTION);
    if (numberedQuestion && !prompt) {
      prompt = numberedQuestion[2].trim();
      return;
    }

    if (!ANSWER_KEYWORD.test(line)) {
      promptLines.push(line);
    }
  });

  if (!prompt && promptLines.length > 0) {
    const firstOptionIndex = promptLines.findIndex((line) => OPTION_LINE.test(line));
    if (firstOptionIndex === -1) {
      prompt = promptLines.join("\n").trim() || promptLines.join(" ").trim();
    } else {
      prompt = promptLines.slice(0, firstOptionIndex).join(" ").trim();
      promptLines.slice(firstOptionIndex).forEach((line) => {
        const optionMatch = line.match(OPTION_LINE);
        if (optionMatch) options.push(optionMatch[1].trim());
      });
    }
  }

  if (!prompt) {
    prompt = body.split("\n").find((line) => line.trim() && !OPTION_LINE.test(line.trim()))?.trim()
      || preservePassageText(body)
      || preservePassageText(block)
      || "본문 문항";
  }

  let answer = "";
  if (answerSection) {
    const answerFirstLine = answerSection.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
    answer = options.length >= 2 ? normalizeAnswerToken(answerFirstLine) : answerFirstLine;
  }

  if (!answer && options.length >= 2) {
    answer = "1";
  }
  if (!answer) {
    answer = preservePassageText(answerSection) || "(미확인)";
  }

  const passageText = readingContext?.readingPassage ?? readingContext?.passage ?? "";

  const readingFields =
    readingContext && passageText
      ? {
          subject: "reading",
          passage: passageText,
          readingPassage: passageText,
          passageId: readingContext.passageId,
        }
      : { subject };

  if (options.length >= 2) {
    const numericAnswer = normalizeAnswerToken(answer);
    const resolvedAnswer = /^[1-5]$/.test(numericAnswer) ? numericAnswer : answer;
    return {
      item: {
        type: "objective",
        ...readingFields,
        prompt,
        answer: resolvedAnswer,
        options: options.slice(0, 5),
      },
    };
  }

  return {
    item: {
      type: "subjective",
      ...readingFields,
      prompt,
      answer,
      options: [],
    },
  };
}

function parseReadingText(text, defaultSubject) {
  const { readingPassage, remainder, matched } = extractReadingPassage(text);
  const questionsSource = matched && remainder.trim() ? remainder : text.trim();

  if (!questionsSource) {
    return null;
  }

  const passageId = createPassageId();
  const readingContext =
    matched && readingPassage
      ? {
          subject: "reading",
          passage: readingPassage,
          readingPassage,
          passageId,
        }
      : null;

  const blocks = splitQuestionBlocks(questionsSource);
  const items = [];
  const errors = [];

  blocks.forEach((block) => {
    const result = parseBlock(block, defaultSubject, readingContext);
    if (result?.item) {
      items.push(result.item);
    }
  });

  if (items.length === 0) return null;
  return { items, errors, readingPassage: readingPassage || "" };
}

export function parseQuestionText(text, { defaultSubject = "grammar" } = {}) {
  const normalized = normalizeNewlines(text);
  if (!normalized.trim()) {
    return { items: [], errors: [] };
  }

  const hasPassageTag = PASSAGE_BLOCK_REGEX.test(normalized) || PASSAGE_OPEN_TAG.test(normalized);
  const shouldTryReading = defaultSubject === "reading" || hasPassageTag;

  if (shouldTryReading) {
    const readingResult = parseReadingText(normalized, defaultSubject);
    if (readingResult && readingResult.items.length > 0) {
      return readingResult;
    }
  }

  const blocks = splitQuestionBlocks(normalized);
  const items = [];

  blocks.forEach((block) => {
    const result = parseBlock(block, defaultSubject);
    if (result?.item) {
      items.push(result.item);
    }
  });

  if (items.length === 0 && normalized.trim()) {
    const fallback = parseBlock(normalized, defaultSubject);
    if (fallback?.item) {
      items.push(fallback.item);
    }
  }

  return { items, errors: [] };
}

export function getTextPasteExample(subject = "grammar") {
  if (subject === "reading") {
    return `[지문]
Tom is a good student. Every morning, he goes to school.
He likes bread and drinks milk at breakfast. His best friend is Amy.
"Hello!" he said to her with a smile.
[She said, "Nice to meet you."]
[/지문]

1. Where does Tom go every morning?
① home
② school
③ park
④ hospital
정답: 2

2. Who is Tom's best friend?
① Amy
② Kate
③ Lucy
④ Jack
정답: 1`;
  }

  return `1. She ___ to school every day.
① go
② goes
③ going
④ went
⑤ gone
정답: 2

2. What is the capital of Korea?
① Seoul
② Busan
③ Incheon
④ Daegu
정답: 1`;
}

export function getTextPasteHint(subject = "grammar") {
  if (subject === "reading") {
    return "Reading: [지문] ... [/지문] 구간만 지문으로 저장됩니다(중간 [ ] 포함 가능). 1. 2. 번호 줄로 문항이 나뉘고, '정답:' 앞은 문제·뒤는 정답으로 인식합니다.";
  }
  return "1. 2. 번호로 문항을 구분하고, '정답:' 앞은 문제·뒤는 정답으로 인식합니다. ①~⑤ 보기도 자동 인식합니다.";
}
