import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import {
  getResultAttemptSessions,
  isAttemptLogCorrect,
  syncWrongAnswerHistoryOnResult,
} from "./wrongAnswerHistory";
import { ensureArray } from "./safeData";

function getExamByTestId(testId) {
  if (!testId) return null;
  return ensureArray(loadExamSets()).find((exam) => exam?.id === testId) ?? null;
}

function buildQuestionMetaMap(result) {
  const synced = syncWrongAnswerHistoryOnResult(result);
  const questions = ensureArray(getExamByTestId(synced.testId)?.questions);
  const metaByQuestionId = new Map();

  ensureArray(synced.details).forEach((detail) => {
    if (detail?.questionId == null) return;
    const question = resolveQuestionForDetail(questions, detail);
    metaByQuestionId.set(String(detail.questionId), {
      num: detail.num,
      questionId: detail.questionId,
      prompt: String(question?.prompt ?? "").trim() || "(문항 정보 없음)",
      correctAnswer: question ? formatQuestionAnswer(question) : "—",
      question,
    });
  });

  return { synced, questions, metaByQuestionId };
}

function buildSessionRowFromLog(log, metaByQuestionId, questions) {
  const meta = metaByQuestionId.get(String(log.questionId));
  const question =
    meta?.question ?? resolveQuestionForDetail(questions, { questionId: log.questionId, num: log.num });
  const prompt =
    meta?.prompt ??
    (String(question?.prompt ?? "").trim() || "(문항 정보 없음)");
  const correctAnswer = meta?.correctAnswer ?? (question ? formatQuestionAnswer(question) : "—");
  const rawUserAnswer = log.userAnswer ?? log.studentAnswer ?? log.userResponse ?? "";

  return {
    num: log.num ?? meta?.num ?? null,
    questionId: log.questionId,
    prompt,
    correctAnswer,
    userAnswer: formatStoredUserAnswer(question, rawUserAnswer),
    rawUserAnswer,
    isCorrect: isAttemptLogCorrect(log),
    submittedAt: log.submittedAt,
    attemptLogId: log.attempt_id ?? null,
  };
}

/**
 * attempt_logs 테이블 기준 응시 단계별 상세 행
 * results.details / 최종 제출본은 사용하지 않음
 */
export function buildSessionBasedDetailView(result) {
  if (!result) {
    return { sessions: [], summary: null };
  }

  const { synced, questions, metaByQuestionId } = buildQuestionMetaMap(result);
  const sessions = getResultAttemptSessions(synced);

  const sessionViews = sessions.map((session) => {
    const rows = session.logs
      .map((log) => buildSessionRowFromLog(log, metaByQuestionId, questions))
      .sort((a, b) => Number(a.num ?? 0) - Number(b.num ?? 0));

    const correctCount = rows.filter((row) => row.isCorrect === true).length;

    return {
      attemptId: session.attempt_id,
      label: session.label,
      attemptNumber: session.attemptNumber,
      attemptType: session.attemptType,
      submittedAt: session.submittedAt,
      score: session.score ?? correctCount,
      total: session.total ?? rows.length,
      rows,
    };
  });

  const percent =
    synced.total > 0 ? Math.round((Number(synced.score) / Number(synced.total)) * 100) : 0;

  return {
    sessions: sessionViews,
    summary: {
      score: synced.score,
      total: synced.total,
      percent,
      attemptCount: Number(synced.attemptCount ?? sessionViews.length) || 1,
      submittedAt: synced.submittedAt,
    },
  };
}

export function hasSessionBasedHistory(result) {
  const { sessions } = buildSessionBasedDetailView(result);
  return sessions.length > 1;
}

/** @deprecated buildSessionBasedDetailView 사용 */
export function buildResultDetailRows(result) {
  const { sessions } = buildSessionBasedDetailView(result);
  const lastSession = sessions[sessions.length - 1];
  if (!lastSession) return [];

  return lastSession.rows.map((row) => ({
    num: row.num,
    questionId: row.questionId,
    prompt: row.prompt,
    correctAnswer: row.correctAnswer,
    correct: row.isCorrect === true,
    latestStudentAnswer: row.userAnswer,
    wrongAttemptDisplays: sessions
      .flatMap((session) =>
        session.rows
          .filter((item) => item.questionId === row.questionId && item.isCorrect === false)
          .map((item) => ({
            attemptId: session.attemptId,
            label: session.label,
            userAnswer: item.userAnswer,
          }))
      ),
    hasWrongHistory: sessions.some((session) =>
      session.rows.some((item) => item.questionId === row.questionId && item.isCorrect === false)
    ),
    wrongAnswerDisplay: "—",
  }));
}

export function hasMultiAttemptHistory(result) {
  return hasSessionBasedHistory(result);
}
