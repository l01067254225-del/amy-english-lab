import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import { resolveDetailStudentAnswer } from "./resultAnswerStorage";
import { ensureArray } from "./safeData";

function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

function buildAttemptEntry(label, rawAnswer, question, correct) {
  return {
    label,
    userAnswer: formatStoredUserAnswer(question, rawAnswer),
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
    const resolvedAnswer = resolveDetailStudentAnswer(detail, result);
    const attempts = [];

    if (detail.examRetest) {
      const firstRaw =
        detail.examRetest.previousUserAnswer ??
        resolveDetailStudentAnswer(
          { ...detail, userAnswer: detail.examRetest.previousUserAnswer },
          result
        );
      const retestRaw =
        detail.examRetest.userAnswer ?? resolvedAnswer;

      attempts.push(
        buildAttemptEntry("1차 시험", firstRaw, question, false),
        buildAttemptEntry("재시험", retestRaw, question, detail.examRetest.correct)
      );
    } else if (attemptCount > 1) {
      attempts.push(
        buildAttemptEntry("최종 응시", resolvedAnswer, question, detail.correct)
      );
    } else {
      attempts.push(
        buildAttemptEntry("1차 시험", resolvedAnswer, question, detail.correct)
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
      latestStudentAnswer: formatStoredUserAnswer(question, resolvedAnswer),
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
