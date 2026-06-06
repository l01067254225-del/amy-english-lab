import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import { resolveDetailStudentAnswer } from "./resultAnswerStorage";
import {
  getWrongAnswersGroupedByAttempt,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";
import { ensureArray } from "./safeData";

function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

function buildWrongAttemptDisplayEntry(log, question) {
  return {
    attemptId: log.attemptId,
    attemptNumber: log.attemptNumber,
    label: log.label,
    userAnswer: formatStoredUserAnswer(question, log.userAnswer),
    rawUserAnswer: log.userAnswer,
    submittedAt: log.submittedAt,
  };
}

export function buildResultDetailRows(result) {
  if (!result) return [];

  const synced = syncWrongAnswerHistoryOnResult(result);
  const questions = ensureArray(getExamByTestId(synced.testId)?.questions);

  return ensureArray(synced.details).map((detail) => {
    const question = resolveQuestionForDetail(questions, detail);
    const prompt = String(question?.prompt ?? "").trim() || "(문항 정보 없음)";
    const correctAnswer = question ? formatQuestionAnswer(question) : "—";
    const finalAnswerRaw = resolveDetailStudentAnswer(detail, synced);
    const wrongByAttempt = getWrongAnswersGroupedByAttempt(synced, detail.questionId);
    const wrongAttemptDisplays = wrongByAttempt.map((log) =>
      buildWrongAttemptDisplayEntry(log, question)
    );

    return {
      num: detail.num,
      questionId: detail.questionId,
      prompt,
      correctAnswer,
      correct: detail.correct === true,
      examRetestPassed: Boolean(detail?.examRetest?.passed),
      latestStudentAnswer: formatStoredUserAnswer(question, finalAnswerRaw),
      wrongAttemptDisplays,
      hasWrongHistory: wrongAttemptDisplays.length > 0,
      wrongAnswerDisplay:
        wrongAttemptDisplays.length > 0
          ? wrongAttemptDisplays[wrongAttemptDisplays.length - 1].userAnswer
          : "—",
    };
  });
}

export function hasMultiAttemptHistory(result) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  if (Number(synced.attemptCount) > 1) return true;
  if (ensureArray(synced.test_attempts).length > 1) return true;
  return ensureArray(synced.details).some(
    (detail) => ensureArray(detail?.wrongAnswerHistory).length > 0
  );
}
