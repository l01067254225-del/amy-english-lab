import { resolveSubject } from "./parseQuestionCsvHelpers";

const CIRCLED_NUMBERS = "①②③④⑤";
const OPTION_LINE =
  /^(?:보기\s*)?(?:[①②③④⑤]|[1-5][.)．、:：\)]\s*|\([1-5]\))\s*(.+)$/u;
const ANSWER_LINE =
  /^(?:정답|답|answer|Answer|ANSWER)\s*[:：]?\s*([①②③④⑤1-5]|\(\s*[1-5]\s*\))\s*$/iu;
const QUESTION_LINE = /^(?:문제|Q|Question)\s*[:：]?\s*(.+)$/iu;
const NUMBERED_QUESTION = /^(\d+)\.\s*(.+)$/;

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

function parseBlock(block, defaultSubject) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { error: "빈 문항 블록입니다." };
  }

  let prompt = "";
  let answer = "";
  let subject = defaultSubject;
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
        subject,
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
      subject,
      prompt,
      answer,
      options: [],
    },
  };
}

export function parseQuestionText(text, { defaultSubject = "grammar" } = {}) {
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

export function getTextPasteExample() {
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
