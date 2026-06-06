import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import {
  formatAttemptColumnLabel,
  getExamAttemptHistory,
  isUserAnswerPresent,
  resolveJoinedAttemptAnswer,
  resolveJoinedAttemptAnswerWithFallback,
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
    if (detail?.questionId == null && detail?.num == null) return;
    const question = resolveQuestionForDetail(questions, detail);
    const key = detail.questionId != null ? String(detail.questionId) : `num-${detail.num}`;
    metaByQuestionId.set(key, {
      num: detail.num,
      questionId: detail.questionId,
      prompt: String(question?.prompt ?? "").trim() || "(문항 정보 없음)",
      correctAnswer: question ? formatQuestionAnswer(question) : "—",
      question,
    });
  });

  return { synced, questions, metaByQuestionId };
}

function buildAnswerCellFromResolved(resolved, question) {
  const rawUserAnswer = resolved.user_answer;
  const hasRecord = resolved.status === "found";

  return {
    userAnswer: hasRecord ? formatStoredUserAnswer(question, rawUserAnswer) : null,
    rawUserAnswer: hasRecord ? rawUserAnswer : null,
    isCorrect: resolved.is_correct ?? null,
    status: hasRecord ? "found" : "missing",
    source: resolved.source,
    fallbackFrom: resolved.fallbackFrom ?? null,
    isEmptyString: hasRecord && rawUserAnswer === "",
  };
}

/**
 * attempt_history + attempt_logs + answers/details join
 * Q1~Q10(details) 기준, attempt_number별 독립 답안
 */
export function buildAttemptWiseDetailView(result) {
  if (!result) {
    return { columns: [], rows: [], attemptHistory: [], isReady: false };
  }

  const { synced, questions, metaByQuestionId } = buildQuestionMetaMap(result);
  const attemptHistory = getExamAttemptHistory(synced);

  const columns =
    attemptHistory.length > 0
      ? attemptHistory.map((session) => ({
          attemptNumber: session.attempt_number,
          attemptId: session.attempt_id,
          columnLabel: formatAttemptColumnLabel(session, attemptHistory),
          submittedAt: session.submitted_at,
          score: session.score,
          total: session.total,
        }))
      : [
          {
            attemptNumber: 1,
            attemptId: null,
            columnLabel: "1차 답안",
            submittedAt: synced.submittedAt,
            score: synced.score,
            total: synced.total,
          },
        ];

  const detailRows = ensureArray(synced.details);
  const rowSource =
    detailRows.length > 0
      ? detailRows
      : attemptHistory.flatMap((session) =>
          session.records.map((record) => ({
            questionId: record.question_id ?? record.questionId,
            num: record.num,
          }))
        );

  const rows = rowSource
    .map((detail) => {
      const questionKey =
        detail.questionId != null ? String(detail.questionId) : `num-${detail.num}`;
      const meta = metaByQuestionId.get(questionKey);
      const question =
        meta?.question ?? resolveQuestionForDetail(questions, detail);
      const questionId = detail.questionId ?? meta?.questionId;
      const num = detail.num ?? meta?.num;

      const answersByAttempt = {};

      columns.forEach((column) => {
        const attemptNumber = column.attemptNumber;
        const resolved =
          attemptNumber === 1
            ? resolveJoinedAttemptAnswerWithFallback(synced, {
                questionId,
                num,
                startAttemptNumber: 1,
              })
            : resolveJoinedAttemptAnswer(synced, attemptNumber, { questionId, num });

        answersByAttempt[attemptNumber] = buildAnswerCellFromResolved(resolved, question);
      });

      return {
        num,
        questionId,
        prompt:
          meta?.prompt ??
          (String(question?.prompt ?? "").trim() || "(문항 정보 없음)"),
        correctAnswer: meta?.correctAnswer ?? (question ? formatQuestionAnswer(question) : "—"),
        answersByAttempt,
      };
    })
    .sort((a, b) => Number(a.num ?? 0) - Number(b.num ?? 0));

  const isReady = rows.some((row) =>
    Object.values(row.answersByAttempt).some((answer) => answer?.status === "found")
  );

  return {
    columns,
    rows,
    attemptHistory,
    isReady,
  };
}

export function hasAttemptWiseHistory(result) {
  const { columns } = buildAttemptWiseDetailView(result);
  return columns.length > 1;
}

/** @deprecated buildAttemptWiseDetailView 사용 */
export function buildSessionBasedDetailView(result) {
  const view = buildAttemptWiseDetailView(result);
  return {
    ...view,
    sessions: view.columns.map((column) => ({
      attemptId: column.attemptId,
      label: column.columnLabel.replace(" 답안", ""),
      attemptNumber: column.attemptNumber,
      submittedAt: column.submittedAt,
      score: column.score,
      total: column.total,
      rows: view.rows.map((row) => {
        const answer = row.answersByAttempt[column.attemptNumber];
        return {
          num: row.num,
          questionId: row.questionId,
          prompt: row.prompt,
          correctAnswer: row.correctAnswer,
          userAnswer: answer?.userAnswer,
          rawUserAnswer: answer?.rawUserAnswer ?? "",
          isCorrect: answer?.isCorrect ?? null,
          status: answer?.status ?? "missing",
        };
      }),
    })),
    summary: {
      attemptCount: view.columns.length || 1,
      attemptScores: view.columns.map((column) => ({
        attemptNumber: column.attemptNumber,
        label: column.columnLabel,
        score: column.score,
        total: column.total,
        submittedAt: column.submittedAt,
      })),
    },
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
        if (!answer || answer.status !== "found" || answer.isCorrect !== false) return null;
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
    wrongAnswerDisplay: row.answersByAttempt[1]?.userAnswer ?? null,
  }));
}

export function hasMultiAttemptHistory(result) {
  return hasAttemptWiseHistory(result);
}

export { isUserAnswerPresent };
