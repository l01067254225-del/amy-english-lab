import { getSubjectLabel } from "./questionBankStorage";

export function getExamSubjectSummary(exam) {
  const subjects = [...new Set((exam?.questions ?? []).map((q) => q.subject).filter(Boolean))];
  if (subjects.length === 0) return "—";
  return subjects.map(getSubjectLabel).join(" · ");
}

export function getExamQuestionCount(exam) {
  return exam?.questions?.length ?? 0;
}
