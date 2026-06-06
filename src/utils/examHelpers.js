import { getSubjectLabel, loadExamSets } from "./questionBankStorage";

export function getExamSubjectSummary(exam) {
  const subjects = [...new Set((exam?.questions ?? []).map((q) => q.subject).filter(Boolean))];
  if (subjects.length === 0) return "—";
  return subjects.map(getSubjectLabel).join(" · ");
}

export function getExamQuestionCount(exam) {
  return exam?.questions?.length ?? 0;
}

export function getSubjectSummaryForTestId(testId) {
  const exam = loadExamSets().find((item) => item.id === testId);
  return getExamSubjectSummary(exam);
}
