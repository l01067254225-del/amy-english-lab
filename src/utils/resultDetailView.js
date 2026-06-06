import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import { ensureArray } from "./safeData";

function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

function buildAttemptEntry(label, userAnswer, question, correct) {
  return {
    label,
    userAnswer: formatStoredUserAnswer(question, userAnswer),
    correct: correct == null ? null : Boolean(correct),
  };
}

export function buildResultDetailRows(result) {
  if (!result) return [];

  const questions = ensureArray(getExamByTestId(result.testId)?.questions);
  const attemptCount = Number(result.attemptCount ?? 1);

  return ensureArray(result.details).map((detail) => {
    const question = resolveQuestionForDetail(questions, detail);
    const prompt = String(question?.prompt ?? "").trim() || "(문항 정보 없음)";
    const correctAnswer = question ? formatQuestionAnswer(question) : "—";
    const attempts = [];

    if (detail.examRetest) {
      attempts.push(
        buildAttemptEntry(
          "1차 시험",
          detail.examRetest.previousUserAnswer ?? "",
          question,
          false
        ),
        buildAttemptEntry(
          "재시험",
          detail.examRetest.userAnswer ?? detail.userAnswer ?? "",
          question,
          detail.examRetest.correct
        )
      );
    } else if (attemptCount > 1) {
      attempts.push(
        buildAttemptEntry("최종 응시", detail.userAnswer ?? "", question, detail.correct)
      );
    } else {
      attempts.push(
        buildAttemptEntry("1차 시험", detail.userAnswer ?? "", question, detail.correct)
      );
    }

    if (detail.clinicRetest) {
      attempts.push(
        buildAttemptEntry(
          "오답 노트",
          detail.clinicRetest.userAnswer ?? "",
          question,
          detail.clinicRetest.correct
        )
      );
    }

    return {
      num: detail.num,
      questionId: detail.questionId,
      prompt,
      correctAnswer,
      correct: detail.correct === true,
      examRetestPassed: Boolean(detail.examRetest?.passed),
      attempts,
      latestStudentAnswer: formatStoredUserAnswer(question, detail.userAnswer),
    };
  });
}

export function hasMultiAttemptHistory(result) {
  const attemptCount = Number(result?.attemptCount ?? 1);
  if (attemptCount > 1) return true;
  return ensureArray(result?.details).some(
    (detail) => detail?.examRetest || detail?.clinicRetest
  );
}
