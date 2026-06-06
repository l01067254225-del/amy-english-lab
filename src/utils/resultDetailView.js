import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import {
  formatAttemptColumnLabel,
  getExamAttemptHistory,
  getUserAnswerAtAttempt,
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

function buildAnswerCellFromHistory(rawUserAnswer, isCorrect, question) {
  return {
    userAnswer: formatStoredUserAnswer(question, rawUserAnswer),
    rawUserAnswer: rawUserAnswer ?? "",
    isCorrect: isCorrect ?? null,
  };
}

/**
 * attempt_history 테이블 기준 — 문항 × 응시회차 매트릭스
 * results.details / 최종 제출본 미사용
 */
export function buildAttemptWiseDetailView(result) {
  if (!result) {
    return { columns: [], rows: [], attemptHistory: [] };
  }

  const { synced, questions, metaByQuestionId } = buildQuestionMetaMap(result);
  const attemptHistory = getExamAttemptHistory(synced);

  const columns = attemptHistory.map((session) => ({
    attemptNumber: session.attempt_number,
    attemptId: session.attempt_id,
    columnLabel: formatAttemptColumnLabel(session, attemptHistory),
    submittedAt: session.submitted_at,
    score: session.score,
    total: session.total,
  }));

  const questionIdSet = new Set(metaByQuestionId.keys());
  attemptHistory.forEach((session) => {
    session.records.forEach((record) => {
      if (record.question_id != null) {
        questionIdSet.add(String(record.question_id));
      }
    });
  });

  const rows = [...questionIdSet]
    .map((questionKey) => {
      const meta = metaByQuestionId.get(questionKey);
      const question =
        meta?.question ??
        resolveQuestionForDetail(questions, { questionId: questionKey, num: meta?.num });

      const answersByAttempt = {};
      attemptHistory.forEach((session) => {
        const record = session.records.find(
          (item) => String(item.question_id) === questionKey
        );
        if (!record) return;

        answersByAttempt[session.attempt_number] = buildAnswerCellFromHistory(
          record.user_answer,
          record.is_correct,
          question
        );
      });

      const firstAttemptRaw = getUserAnswerAtAttempt(synced, 1, questionKey);

      return {
        num: meta?.num ?? attemptHistory[0]?.records.find((r) => String(r.question_id) === questionKey)?.num,
        questionId: meta?.questionId ?? questionKey,
        prompt:
          meta?.prompt ??
          (String(question?.prompt ?? "").trim() || "(문항 정보 없음)"),
        correctAnswer: meta?.correctAnswer ?? (question ? formatQuestionAnswer(question) : "—"),
        answersByAttempt,
        firstAttemptAnswer: buildAnswerCellFromHistory(firstAttemptRaw, null, question),
      };
    })
    .sort((a, b) => Number(a.num ?? 0) - Number(b.num ?? 0));

  return {
    columns,
    rows,
    attemptHistory,
  };
}

export function hasAttemptWiseHistory(result) {
  const { columns } = buildAttemptWiseDetailView(result);
  return columns.length > 1;
}

/** @deprecated buildAttemptWiseDetailView 사용 */
export function buildSessionBasedDetailView(result) {
  const { columns, rows, attemptHistory } = buildAttemptWiseDetailView(result);

  const sessions = columns.map((column) => ({
    attemptId: column.attemptId,
    label: column.columnLabel.replace(" 답안", ""),
    attemptNumber: column.attemptNumber,
    submittedAt: column.submittedAt,
    score: column.score,
    total: column.total,
    rows: rows.map((row) => {
      const answer = row.answersByAttempt[column.attemptNumber];
      return {
        num: row.num,
        questionId: row.questionId,
        prompt: row.prompt,
        correctAnswer: row.correctAnswer,
        userAnswer: answer?.userAnswer ?? "—",
        rawUserAnswer: answer?.rawUserAnswer ?? "",
        isCorrect: answer?.isCorrect ?? null,
      };
    }),
  }));

  return {
    sessions,
    summary: {
      attemptCount: columns.length || 1,
      attemptScores: columns.map((column) => ({
        attemptNumber: column.attemptNumber,
        label: column.columnLabel,
        score: column.score,
        total: column.total,
        submittedAt: column.submittedAt,
      })),
    },
    attemptHistory,
  };
}

export function hasSessionBasedHistory(result) {
  return hasAttemptWiseHistory(result);
}

/** @deprecated buildAttemptWiseDetailView 사용 */
export function buildResultDetailRows(result) {
  const { rows, columns } = buildAttemptWiseDetailView(result);
  if (rows.length === 0) return [];

  return rows.map((row) => ({
    num: row.num,
    questionId: row.questionId,
    prompt: row.prompt,
    correctAnswer: row.correctAnswer,
    correct: row.answersByAttempt[columns[columns.length - 1]?.attemptNumber]?.isCorrect === true,
    wrongAttemptDisplays: columns
      .map((column) => {
        const answer = row.answersByAttempt[column.attemptNumber];
        if (!answer || answer.isCorrect !== false) return null;
        return {
          attemptId: column.attemptId,
          label: column.columnLabel,
          userAnswer: answer.userAnswer,
        };
      })
      .filter(Boolean),
    hasWrongHistory: columns.some(
      (column) => row.answersByAttempt[column.attemptNumber]?.isCorrect === false
    ),
    wrongAnswerDisplay: row.firstAttemptAnswer?.userAnswer ?? "—",
  }));
}

export function hasMultiAttemptHistory(result) {
  return hasAttemptWiseHistory(result);
}
