import { resolveSubject } from "./parseQuestionCsvHelpers";
import { createPassageId } from "./readingPassage";

const CIRCLED_NUMBERS = "①②③④⑤";
const OPTION_LINE =
  /^(?:보기\s*)?(?:[①②③④⑤]|[1-5][.)．、:：\)]\s*|\([1-5]\))\s*(.+)$/u;
const QUESTION_LINE = /^(?:문제|Q|Question)\s*[:：]?\s*(.+)$/iu;
const NUMBERED_QUESTION = /^(\d+)\.\s*(.+)$/;
const ANSWER_KEYWORD = /정답\s*[:：]/i;
const ANSWER_KEYWORD_SPLIT = /([\s\S]*?)\n?\s*정답\s*[:：]\s*([\s\S]*)$/i;

/** [지문] / [지문1] ~ [/지문] / [/지문1] — backref keeps inner [ ] intact */
const MULTI_PASSAGE_BLOCK_REGEX = /\[지문(\d*)\]\s*([\s\S]*?)\[\/지문\1\]/gi;

export function preservePassageText(text) {
  return String(text ?? "").replace(/^\s+/, "").replace(/\s+$/, "");
}

function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n");
}

export function extractAllReadingPassages(text) {
  const source = normalizeNewlines(text);
  const passages = [];
  const regex = new RegExp(MULTI_PASSAGE_BLOCK_REGEX.source, "gi");
  let match = regex.exec(source);

  while (match) {
    const passageNumber = match[1] ? parseInt(match[1], 10) : 1;
    passages.push({
      passageNumber: Number.isFinite(passageNumber) ? passageNumber : 1,
      readingPassage: preservePassageText(match[2]),
      start: match.index,
      end: match.index + match[0].length,
      passageId: createPassageId(),
    });
    match = regex.exec(source);
  }

  return passages.sort((a, b) => a.passageNumber - b.passageNumber);
}

export function stripReadingPassageBlocks(text) {
  return normalizeNewlines(text)
    .replace(/\[지문(\d*)\]\s*[\s\S]*?\[\/지문\1\]/gi, "")
    .trim();
}

export function extractReadingPassage(text) {
  const passages = extractAllReadingPassages(text);
  if (passages.length === 0) {
    return { readingPassage: "", remainder: normalizeNewlines(text).trim(), matched: false };
  }

  if (passages.length === 1) {
    const readingPassage = passages[0].readingPassage;
    const remainder = stripReadingPassageBlocks(text);
    return { readingPassage, remainder, matched: Boolean(readingPassage) };
  }

  const combined = passages
    .map((entry) => `[지문${entry.passageNumber}]\n${entry.readingPassage}`)
    .join("\n\n");
  const remainder = stripReadingPassageBlocks(text);
  return { readingPassage: combined, remainder, matched: true, passages };
}

export function formatPassagesPreviewText(text) {
  const passages = extractAllReadingPassages(text);
  if (passages.length === 0) return "";
  if (passages.length === 1) return passages[0].readingPassage;
  return passages
    .map((entry) => `[지문${entry.passageNumber}]\n${entry.readingPassage}`)
    .join("\n\n— — —\n\n");
}

function extractQuestionNumber(block) {
  const match = block.trim().match(/^(\d+)\.\s/);
  return match ? parseInt(match[1], 10) : null;
}

function findBlockOffsets(source, blocks) {
  let cursor = 0;
  return blocks.map((block) => {
    const idx = source.indexOf(block, cursor);
    if (idx >= 0) {
      cursor = idx + block.length;
      return idx;
    }
    return cursor;
  });
}

function assignPassageToQuestion({ questionNumber, offset }, passages, questionOffsets) {
  if (!passages.length) return null;

  const sorted = [...passages].sort((a, b) => a.passageNumber - b.passageNumber);
  const firstQuestionOffset = Math.min(...questionOffsets.filter((o) => Number.isFinite(o)));
  const passagesBeforeAllQuestions =
    Number.isFinite(firstQuestionOffset) &&
    passages.every((entry) => entry.end <= firstQuestionOffset);

  if (!passagesBeforeAllQuestions) {
    const byPosition = passages
      .filter((entry) => entry.end <= offset)
      .sort((a, b) => b.end - a.end);
    if (byPosition.length > 0) {
      return byPosition[0];
    }
  }

  if (questionNumber == null) {
    return sorted[0];
  }

  const QUESTIONS_PER_PASSAGE = 5;
  const index = Math.min(
    Math.floor((questionNumber - 1) / QUESTIONS_PER_PASSAGE),
    sorted.length - 1
  );
  return sorted[Math.max(0, index)];
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

function buildReadingFields(readingContext) {
  if (!readingContext?.readingPassage) return {};

  return {
    subject: "reading",
    passage: readingContext.readingPassage,
    readingPassage: readingContext.readingPassage,
    passageId: readingContext.passageId,
    passageNumber: readingContext.passageNumber ?? null,
  };
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
    prompt =
      body.split("\n").find((line) => line.trim() && !OPTION_LINE.test(line.trim()))?.trim() ||
      preservePassageText(body) ||
      preservePassageText(block) ||
      "본문 문항";
  }

  let answer = "";
  if (answerSection) {
    const answerFirstLine =
      answerSection.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
    answer = options.length >= 2 ? normalizeAnswerToken(answerFirstLine) : answerFirstLine;
  }

  if (!answer && options.length >= 2) {
    answer = "1";
  }
  if (!answer) {
    answer = preservePassageText(answerSection) || "(미확인)";
  }

  const readingFields = buildReadingFields(readingContext);

  if (options.length >= 2) {
    const numericAnswer = normalizeAnswerToken(answer);
    const resolvedAnswer = /^[1-5]$/.test(numericAnswer) ? numericAnswer : answer;
    return {
      item: {
        type: "objective",
        ...readingFields,
        subject: readingFields.subject ?? subject,
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
      subject: readingFields.subject ?? subject,
      prompt,
      answer,
      options: [],
    },
  };
}

function parseReadingText(text, defaultSubject) {
  const source = normalizeNewlines(text);
  const passages = extractAllReadingPassages(source);
  const questionsSource =
    passages.length > 0 ? stripReadingPassageBlocks(source) : source.trim();

  if (!questionsSource && passages.length === 0) {
    return null;
  }

  const blocks = splitQuestionBlocks(questionsSource || source);
  if (blocks.length === 0 && passages.length === 0) {
    return null;
  }

  const offsets = findBlockOffsets(source, blocks);
  const questionNumbers = blocks.map(extractQuestionNumber);
  const items = [];

  blocks.forEach((block, index) => {
    const assigned = assignPassageToQuestion(
      { questionNumber: questionNumbers[index], offset: offsets[index] ?? 0 },
      passages,
      offsets
    );

    const readingContext = assigned
      ? {
          subject: "reading",
          readingPassage: assigned.readingPassage,
          passageId: assigned.passageId,
          passageNumber: assigned.passageNumber,
        }
      : passages.length === 1
        ? {
            subject: "reading",
            readingPassage: passages[0].readingPassage,
            passageId: passages[0].passageId,
            passageNumber: passages[0].passageNumber,
          }
        : null;

    const result = parseBlock(block, defaultSubject, readingContext);
    if (result?.item) {
      items.push(result.item);
    }
  });

  if (items.length === 0) return null;

  return {
    items,
    errors: [],
    readingPassage: passages.map((entry) => entry.readingPassage).join("\n\n"),
    passages,
  };
}

export function parseQuestionText(text, { defaultSubject = "grammar" } = {}) {
  const normalized = normalizeNewlines(text);
  if (!normalized.trim()) {
    return { items: [], errors: [] };
  }

  const hasPassageTag = /\[지문(\d*)\]/i.test(normalized);
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
    return `[지문1]
Tom is a good student. Every morning, he goes to school.
He likes bread and drinks milk at breakfast.
[/지문1]

[지문2]
Amy loves reading books. She visits the library every week.
"Books are my best friends," she said with a smile.
[/지문2]

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
정답: 1

6. What does Amy love?
① sports
② reading books
③ cooking
④ music
정답: 2

7. Where does Amy go every week?
① park
② library
③ school
④ market
정답: 2`;
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
    return "Reading: [지문1]...[/지문1], [지문2]...[/지문2] 형태로 여러 지문을 등록할 수 있습니다. 1~5번은 [지문1], 6~10번은 [지문2]처럼 문항 번호 범위에 맞게 자동 연결됩니다.";
  }
  return "1. 2. 번호로 문항을 구분하고, '정답:' 앞은 문제·뒤는 정답으로 인식합니다. ①~⑤ 보기도 자동 인식합니다.";
}
