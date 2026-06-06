export const MAX_MCQ_OPTIONS = 5;

export const EMPTY_MCQ_OPTIONS = ["", "", "", "", ""];

export function trimMcqOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .slice(0, MAX_MCQ_OPTIONS)
    .map((option) => String(option ?? "").trim())
    .filter(Boolean);
}

export function resolveMcqOptionCount(options) {
  const trimmed = trimMcqOptions(options);
  if (trimmed.length === 0) return 0;
  return trimmed.length;
}

export function isValidMcqAnswer(answer, optionCount) {
  const num = Number(String(answer).trim());
  return Number.isInteger(num) && num >= 1 && num <= optionCount;
}
