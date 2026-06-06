import { SUBJECT_OPTIONS } from "./questionBankStorage";

const SUBJECT_ALIASES = {
  voca: "vocab",
  vocab: "vocab",
  vocabulary: "vocab",
  writing: "writing",
  grammar: "grammar",
  reading: "reading",
  단어: "vocab",
  작문: "writing",
  문법: "grammar",
  독해: "reading",
};

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

function resolveSubject(raw) {
  const value = String(raw ?? "vocab").trim();
  if (!value) return "vocab";

  const alias = SUBJECT_ALIASES[value.toLowerCase()];
  if (alias) return alias;

  const matched = SUBJECT_OPTIONS.find(
    (option) =>
      option.id.toLowerCase() === value.toLowerCase() ||
      option.label.toLowerCase() === value.toLowerCase()
  );
  return matched?.id ?? "vocab";
}

function isHeaderRow(cols) {
  const joined = cols.join(" ").toLowerCase();
  return /단어|정답|과목|prompt|answer|subject|문제/.test(joined);
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
      errors.push(`${lineIndex + 1}행: '단어,정답,과목' 형식이 아닙니다.`);
      return;
    }

    if (lineIndex === 0 && isHeaderRow(cols)) {
      return;
    }

    const [prompt, answer, subjectRaw = "vocab"] = cols;
    if (!prompt || !answer) {
      errors.push(`${lineIndex + 1}행: 단어와 정답은 필수입니다.`);
      return;
    }

    items.push({
      type: "subjective",
      subject: resolveSubject(subjectRaw),
      prompt,
      answer,
      options: [],
    });
  });

  return { items, errors };
}
