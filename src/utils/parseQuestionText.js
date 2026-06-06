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

function stripPassageHeader(text) {
  return text
    .replace(/^\[지문\]\s*/i, "")
    .replace(/^지문\s*[:：]\s*/i, "")
    .trim();
}

function findFirstQuestionLineIndex(lines) {
  return lines.findIndex((line) => NUMBERED_QUESTION.test(line.trim()));
}

function extractPassageAndQuestions(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");

  const explicitPassageIdx = lines.findIndex((line) => PASSAGE_HEADER.test(line.trim()));
  if (explicitPassageIdx >= 0) {
    const afterHeader = lines.slice(explicitPassageIdx);
    const firstQuestionInRest = findFirstQuestionLineIndex(
      afterHeader.map((line) => line.trim())
    );
    if (firstQuestionInRest > 0) {
      const passageLines = afterHeader.slice(0, firstQuestionInRest);
      const questionLines = afterHeader.slice(firstQuestionInRest);
      return {
        passage: stripPassageHeader(passageLines.join("\n")),
        questionsText: questionLines.join("\n"),
      };
    }
  }

  const trimmedLines = lines.map((line) => line.trim());
  const firstQuestionIdx = findFirstQuestionLineIndex(trimmedLines);
  if (firstQuestionIdx <= 0) return null;

  const passageLines = lines.slice(0, firstQuestionIdx);
  const questionLines = lines.slice(firstQuestionIdx);
  const passage = stripPassageHeader(passageLines.join("\n").trim());

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

  const readingFields =
    readingContext && readingContext.passage
      ? {
          subject: "reading",
          passage: readingContext.passage,
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
  const extracted = extractPassageAndQuestions(text);
  if (!extracted || !extracted.passage || !extracted.questionsText.trim()) {
    return null;
  }

  const passageId = createPassageId();
  const readingContext = {
    subject: "reading",
    passage: extracted.passage,
    passageId,
  };

  const blocks = splitQuestionBlocks(extracted.questionsText);
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
  return { items, errors };
}

export function parseQuestionText(text, { defaultSubject = "grammar" } = {}) {
  if (defaultSubject === "reading" || PASSAGE_HEADER.test(text)) {
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
Tom is a good student. Every morning, he goes to school. He likes bread and drinks milk at breakfast. His best friend is Amy.

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
    return "Reading: 상단 긴 글은 지문, 아래 1. 2. 번호 문항은 개별 문제로 자동 분리됩니다. [지문] 표시 또는 빈 줄 구분을 권장합니다.";
  }
  return "①~⑤ 또는 1)~5) 보기, '정답: N' 형식을 자동 인식합니다. 문항은 빈 줄로 구분하세요.";
}
