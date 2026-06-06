import { resolveSubject } from "./parseQuestionCsvHelpers";
import { createPassageId } from "./readingPassage";

const CIRCLED_NUMBERS = "①②③④⑤";
const OPTION_LINE =
  /^(?:보기\s*)?(?:[①②③④⑤]|[1-5][.)．、:：\)]\s*|\([1-5]\))\s*(.+)$/u;
const ANSWER_LINE =
  /^(?:정답|답|answer|Answer|ANSWER)\s*[:：]?\s*([①②③④⑤1-5]|\(\s*[1-5]\s*\))\s*$/iu;
const QUESTION_LINE = /^(?:문제|Q|Question)\s*[:：]?\s*(.+)$/iu;
const NUMBERED_QUESTION = /^(\d+)\.\s*(.+)$/;
const PASSAGE_HEADER = /^\[지문\]|^지문\s*[:：]/i;

/** [지문] ... [/지문] — non-greedy capture preserves inner brackets/quotes/newlines */
const PASSAGE_CLOSED_TAG_REGEX = /\[지문\]\s*([\s\S]*?)\s*\[\/지문\]/i;

/** Leading [ ... ] block — closing bracket on its own line (multiline passage) */
const PASSAGE_BRACKET_MULTILINE_REGEX = /^\s*\[\s*\n([\s\S]*?)\n\s*\]\s*\n([\s\S]+)$/;

/** Leading [ ... ] block (single pair on one or more lines before questions) */
const PASSAGE_BRACKET_WRAP_REGEX = /^\s*\[([\s\S]*?)\]\s*\n([\s\S]+)$/;

export function preservePassageText(text) {
  return String(text ?? "").replace(/^\s+/, "").replace(/\s+$/, "");
}

export function extractReadingPassage(text) {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  if (!source.trim()) {
    return { readingPassage: "", remainder: "", matched: false };
  }

  const closedMatch = source.match(PASSAGE_CLOSED_TAG_REGEX);
  if (closedMatch) {
    const readingPassage = preservePassageText(closedMatch[1]);
    const remainder = source.slice(closedMatch.index + closedMatch[0].length).trim();
    return { readingPassage, remainder, matched: Boolean(readingPassage) };
  }

  const openTagMatch = source.match(/^\s*\[지문\]\s*/i);
  if (openTagMatch) {
    const afterTag = source.slice(openTagMatch[0].length);
    const split = splitPassageFromQuestionLines(afterTag);
    if (split) {
      return {
        readingPassage: split.passage,
        remainder: split.questionsText,
        matched: Boolean(split.passage),
      };
    }
  }

  const multilineBracket = source.match(PASSAGE_BRACKET_MULTILINE_REGEX);
  if (multilineBracket && !/^\s*\[지문\]/i.test(source)) {
    const readingPassage = preservePassageText(multilineBracket[1]);
    const remainder = multilineBracket[2].trim();
    if (readingPassage && remainder) {
      return { readingPassage, remainder, matched: true };
    }
  }

  const bracketMatch = source.match(PASSAGE_BRACKET_WRAP_REGEX);
  if (bracketMatch && !/^\s*\[지문\]/i.test(source)) {
    const readingPassage = preservePassageText(bracketMatch[1]);
    const remainder = bracketMatch[2].trim();
    if (readingPassage && remainder) {
      return { readingPassage, remainder, matched: true };
    }
  }

  const legacy = extractPassageAndQuestionsLegacy(source);
  if (legacy?.passage) {
    return {
      readingPassage: legacy.passage,
      remainder: legacy.questionsText,
      matched: true,
    };
  }

  return { readingPassage: "", remainder: source.trim(), matched: false };
}

function splitPassageFromQuestionLines(text) {
  const lines = text.split("\n");
  const trimmed = lines.map((line) => line.trim());
  const firstQuestionIdx = findFirstQuestionLineIndex(trimmed);
  if (firstQuestionIdx <= 0) {
    const passage = preservePassageText(text);
    return passage ? { passage, questionsText: "" } : null;
  }

  return {
    passage: preservePassageText(lines.slice(0, firstQuestionIdx).join("\n")),
    questionsText: lines.slice(firstQuestionIdx).join("\n").trim(),
  };
}

function normalizeAnswerToken(token) {
  const value = String(token ?? "").trim();
  const circledIndex = CIRCLED_NUMBERS.indexOf(value);
  if (circledIndex >= 0) return String(circledIndex + 1);
  const matched = value.match(/[1-5]/);
  return matched ? matched[0] : value;
}

function splitQuestionBlocks(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length > 1) return blocks;

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const grouped = [];
  let current = [];

  lines.forEach((line) => {
    if (NUMBERED_QUESTION.test(line) && current.length > 0) {
      grouped.push(current.join("\n"));
      current = [line];
      return;
    }
    current.push(line);
  });

  if (current.length > 0) grouped.push(current.join("\n"));
  return grouped.length > 0 ? grouped : [normalized];
}

function findFirstQuestionLineIndex(lines) {
  return lines.findIndex((line) => NUMBERED_QUESTION.test(line.trim()));
}

function extractPassageAndQuestionsLegacy(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");

  const trimmedLines = lines.map((line) => line.trim());
  const firstQuestionIdx = findFirstQuestionLineIndex(trimmedLines);
  if (firstQuestionIdx <= 0) return null;

  const passageLines = lines.slice(0, firstQuestionIdx);
  const questionLines = lines.slice(firstQuestionIdx);
  const passage = preservePassageText(
    passageLines
      .join("\n")
      .replace(/^\[지문\]\s*/i, "")
      .replace(/^지문\s*[:：]\s*/i, "")
  );

  if (passage.length < 40 && !PASSAGE_HEADER.test(passageLines.join("\n"))) {
    return null;
  }

  return {
    passage,
    questionsText: questionLines.join("\n"),
  };
}

function parseBlock(block, defaultSubject, readingContext = null) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { error: "빈 문항 블록입니다." };
  }

  let prompt = "";
  let answer = "";
  let subject = readingContext?.subject ?? defaultSubject;
  const options = [];
  const promptLines = [];

  lines.forEach((line) => {
    const questionMatch = line.match(QUESTION_LINE);
    if (questionMatch) {
      prompt = questionMatch[1].trim();
      return;
    }

    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      answer = normalizeAnswerToken(answerMatch[1]);
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

    promptLines.push(line);
  });

  if (!prompt && promptLines.length > 0) {
    const firstOptionIndex = promptLines.findIndex((line) => OPTION_LINE.test(line));
    if (firstOptionIndex === -1) {
      prompt = promptLines.join(" ").trim();
    } else {
      prompt = promptLines.slice(0, firstOptionIndex).join(" ").trim();
      promptLines.slice(firstOptionIndex).forEach((line) => {
        const optionMatch = line.match(OPTION_LINE);
        if (optionMatch) options.push(optionMatch[1].trim());
      });
    }
  }

  if (!prompt) {
    return { error: "문제 문장을 찾지 못했습니다." };
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
    if (!answer) {
      return { error: `'${prompt.slice(0, 24)}...' 정답을 찾지 못했습니다.` };
    }
    if (!/^[1-5]$/.test(answer) || Number(answer) > options.length) {
      return { error: `'${prompt.slice(0, 24)}...' 정답 번호가 보기 개수와 맞지 않습니다.` };
    }
    return {
      item: {
        type: "objective",
        ...readingFields,
        prompt,
        answer,
        options: options.slice(0, 5),
      },
    };
  }

  if (!answer) {
    const inlineAnswer = block.match(/(?:정답|답)\s*[:：]\s*(.+)$/imu);
    if (inlineAnswer) {
      answer = inlineAnswer[1].trim();
    }
  }

  if (!answer) {
    return { error: `'${prompt.slice(0, 24)}...' 정답을 찾지 못했습니다.` };
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
  if (!matched || !readingPassage || !remainder.trim()) {
    return null;
  }

  const passageId = createPassageId();
  const readingContext = {
    subject: "reading",
    passage: readingPassage,
    readingPassage,
    passageId,
  };

  const blocks = splitQuestionBlocks(remainder);
  const items = [];
  const errors = [];

  blocks.forEach((block, index) => {
    const result = parseBlock(block, defaultSubject, readingContext);
    if (result.error) {
      errors.push(`Reading ${index + 1}번째 문제: ${result.error}`);
      return;
    }
    items.push(result.item);
  });

  if (items.length === 0) return null;
  return { items, errors, readingPassage };
}

export function parseQuestionText(text, { defaultSubject = "grammar" } = {}) {
  const shouldTryReading =
    defaultSubject === "reading" ||
    PASSAGE_HEADER.test(text) ||
    PASSAGE_CLOSED_TAG_REGEX.test(text) ||
    /^\s*\[[\s\S]*?\]\s*\n/m.test(text);

  if (shouldTryReading) {
    const readingResult = parseReadingText(text, defaultSubject);
    if (readingResult && readingResult.items.length > 0) {
      return readingResult;
    }
  }

  const blocks = splitQuestionBlocks(text);
  const items = [];
  const errors = [];

  blocks.forEach((block, index) => {
    const result = parseBlock(block, defaultSubject);
    if (result.error) {
      errors.push(`${index + 1}번째 블록: ${result.error}`);
      return;
    }
    items.push(result.item);
  });

  return { items, errors };
}

export function getTextPasteExample(subject = "grammar") {
  if (subject === "reading") {
    return `[지문]
Tom is a good student. Every morning, he goes to school.
He likes bread and drinks milk at breakfast. His best friend is Amy.
"Hello!" he said to her with a smile.
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
    return "Reading: [지문] ... [/지문] 또는 [지문 전체] 형태로 입력하면 지문이 하나의 블록으로 저장됩니다. 아래 1. 2. 번호 문항은 개별 문제로 분리됩니다.";
  }
  return "①~⑤ 또는 1)~5) 보기, '정답: N' 형식을 자동 인식합니다. 문항은 빈 줄로 구분하세요.";
}
