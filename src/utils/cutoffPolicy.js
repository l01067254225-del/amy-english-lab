import {
  SUBJECT_KEYS,
  SUBJECT_SMS_LABELS,
  computeSubjectScoresFromResult,
} from "./scoreAnalytics";
import { ensureArray } from "./safeData";

export const CUTOFF_SCORES = {
  vocab: 85,
  writing: 80,
  grammar: 80,
  reading: 80,
};

export function resolveQuestionForDetail(questions, detail) {
  const list = ensureArray(questions);
  if (!detail) return null;

  if (detail.questionId) {
    return list.find((question) => question.id === detail.questionId) ?? null;
  }

  const index = Number(detail.num) - 1;
  if (index >= 0 && index < list.length) {
    return list[index];
  }

  return null;
}

export function evaluateCutoff(result) {
  const subjectScores = computeSubjectScoresFromResult(result);
  const failedSubjects = SUBJECT_KEYS.filter((subject) => {
    const score = subjectScores[subject];
    if (score == null) return false;
    return score < CUTOFF_SCORES[subject];
  });

  const testedSubjects = SUBJECT_KEYS.filter((subject) => subjectScores[subject] != null);

  return {
    subjectScores,
    failedSubjects,
    testedSubjects,
    passed: failedSubjects.length === 0,
    needsRetest: failedSubjects.length > 0,
  };
}

export function getCutoffWarningMessage(failedSubjects) {
  if (!failedSubjects?.length) return "";
  const labels = failedSubjects.map((subject) => SUBJECT_SMS_LABELS[subject]).join(", ");
  return `⚠️ 점수가 커트라인(단어 85점, 타 영역 80점) 미달입니다. 재시험을 먼저 통과해야 오답 노트를 진행할 수 있습니다.${labels ? ` (미달 영역: ${labels})` : ""}`;
}
