import { getSubjectLabel, loadExamSets } from "./questionBankStorage";
import { ensureArray } from "./safeData";

export function getExamSubjectSummary(exam) {
  const subjects = [
    ...new Set(ensureArray(exam?.questions).map((q) => q?.subject).filter(Boolean)),
  ];
  if (subjects.length === 0) return "—";
  return subjects.map(getSubjectLabel).join(" · ");
}

export function getExamQuestionCount(exam) {
  return ensureArray(exam?.questions).length;
}

export function getSubjectSummaryForTestId(testId) {
  if (!testId) return "—";
  const exam = ensureArray(loadExamSets()).find((item) => item?.id === testId);
  return getExamSubjectSummary(exam);
}
