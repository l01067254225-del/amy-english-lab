import { isValidMcqAnswer } from "./mcqOptions";
import { resolveSubject } from "./parseQuestionCsvHelpers";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  result.push(current.trim());
  return result;
}

function isHeaderRow(cols) {
  const joined = cols.join(" ").toLowerCase();
  return /단어|정답|과목|prompt|answer|subject|문제|보기/.test(joined);
}

function resolveObjectiveAnswer(rawAnswer, options) {
  const answerText = String(rawAnswer ?? "").trim();
  if (!answerText) return null;

  if (/^[1-5]$/.test(answerText) && isValidMcqAnswer(answerText, options.length)) {
    return answerText;
  }

  const index = options.findIndex(
    (option) => option.toLowerCase() === answerText.toLowerCase()
  );
  if (index >= 0) return String(index + 1);

  return null;
}

function buildObjectiveItem(prompt, answerRaw, subjectRaw, optionCols) {
  const rawOptions = optionCols.slice(0, 5).map((col) => String(col ?? "").trim());
  const hasOption5 = Boolean(rawOptions[4]);
  const requiredCount = hasOption5 ? 5 : 4;
  const options = rawOptions.slice(0, requiredCount);

  if (options.some((option) => !option)) {
    return { error: "객관식 보기 1~4번(또는 5지선다 시 5번)을 모두 입력해야 합니다." };
  }

  const answer = resolveObjectiveAnswer(answerRaw, options);
  if (!answer) {
    return { error: "정답은 1~5 보기 번호 또는 보기 텍스트와 일치해야 합니다." };
  }

  return {
    item: {
      type: "objective",
      subject: resolveSubject(subjectRaw),
      prompt,
      answer,
      options,
    },
  };
}

export function parseQuestionCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const errors = [];

  lines.forEach((line, lineIndex) => {
    const cols = parseCsvLine(line);
    if (cols.length < 2) {
      errors.push(`${lineIndex + 1}행: 최소 '문제,정답' 형식이 필요합니다.`);
      return;
    }

    if (lineIndex === 0 && isHeaderRow(cols)) {
      return;
    }

    const [prompt, answerRaw, subjectRaw = "vocab", ...optionCols] = cols;
    if (!prompt || !answerRaw) {
      errors.push(`${lineIndex + 1}행: 문제와 정답은 필수입니다.`);
      return;
    }

    const hasOptions = optionCols.slice(0, 5).some((col) => String(col ?? "").trim());
    if (!hasOptions) {
      items.push({
        type: "subjective",
        subject: resolveSubject(subjectRaw),
        prompt,
        answer: answerRaw,
        options: [],
      });
      return;
    }

    const result = buildObjectiveItem(prompt, answerRaw, subjectRaw, optionCols);
    if (result.error) {
      errors.push(`${lineIndex + 1}행: ${result.error}`);
      return;
    }
    items.push(result.item);
  });

  return { items, errors };
}

export function parseQuestionCsvRowPreview() {
  return "문제,정답,과목,보기1,보기2,보기3,보기4,보기5";
}
