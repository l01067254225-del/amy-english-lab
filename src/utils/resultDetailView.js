import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import { resolveDetailStudentAnswer, coalesceStudentAnswer } from "./resultAnswerStorage";
import {
  getLatestWrongAnswerRaw,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";
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

  const synced = syncWrongAnswerHistoryOnResult(result);
  const questions = ensureArray(getExamByTestId(synced.testId)?.questions);
  const attemptCount = Number(synced.attemptCount ?? 1);

  return ensureArray(synced.details).map((detail) => {
    const question = resolveQuestionForDetail(questions, detail);
    const prompt = String(question?.prompt ?? "").trim() || "(문항 정보 없음)";
    const correctAnswer = question ? formatQuestionAnswer(question) : "—";
    const finalAnswerRaw = resolveDetailStudentAnswer(detail, synced);
    const wrongAnswerRaw = getLatestWrongAnswerRaw(synced, detail.questionId, detail);
    const attempts = [];

    if (detail.examRetest) {
      const firstRaw = coalesceStudentAnswer(
        detail.examRetest.previousUserAnswer,
        detail.examRetest.previousStudentAnswer,
        detail.examRetest.previousUserResponse
      );
      const retestRaw = coalesceStudentAnswer(
        detail.examRetest.userAnswer,
        detail.examRetest.studentAnswer,
        detail.examRetest.userResponse,
        finalAnswerRaw
      );

      attempts.push(
        buildAttemptEntry("1차 시험", firstRaw, question, false),
        buildAttemptEntry("재시험", retestRaw, question, detail.examRetest.correct)
      );
    } else if (attemptCount > 1) {
      attempts.push(
        buildAttemptEntry("최종 응시", finalAnswerRaw, question, detail.correct)
      );
    } else {
      attempts.push(
        buildAttemptEntry("1차 시험", finalAnswerRaw, question, detail.correct)
      );
    }

    if (detail.clinicRetest) {
      attempts.push(
        buildAttemptEntry(
          "오답 노트",
          coalesceStudentAnswer(
            detail.clinicRetest.userAnswer,
            detail.clinicRetest.studentAnswer,
            detail.clinicRetest.userResponse
          ),
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
      latestStudentAnswer: formatStoredUserAnswer(question, finalAnswerRaw),
      wrongAnswerDisplay:
        wrongAnswerRaw != null ? formatStoredUserAnswer(question, wrongAnswerRaw) : "—",
      hasWrongHistory: wrongAnswerRaw != null,
    };
  });
}

export function hasMultiAttemptHistory(result) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  const attemptCount = Number(synced.attemptCount ?? 1);
  if (attemptCount > 1) return true;
  if (ensureArray(synced.test_attempts).length > 1) return true;
  if (ensureArray(synced.answer_logs).length > 0) return true;
  return ensureArray(synced.details).some(
    (detail) => detail?.examRetest || detail?.clinicRetest || detail?.wrongAnswerHistory?.length
  );
}
