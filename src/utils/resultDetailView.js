import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatQuestionAnswer, loadExamSets } from "./questionBankStorage";
import { formatStoredUserAnswer } from "./examRetestStorage";
import {
  FIRST_ATTEMPT_NUMBER,
  FIRST_EXAM_ANSWER_COLUMN_LABEL,
  getFirstAttemptSession,
  isUserAnswerPresent,
  resolveFirstExamAnswer,
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

function buildAnswerCell(resolved, question) {
  const hasRecord = resolved.status === "found";
  const rawUserAnswer = resolved.user_answer;

  return {
    userAnswer: hasRecord ? formatStoredUserAnswer(question, rawUserAnswer) : null,
    rawUserAnswer: hasRecord ? rawUserAnswer : null,
    isCorrect: resolved.is_correct ?? null,
    status: hasRecord ? "found" : "missing",
    source: resolved.source,
    isEmptyString: hasRecord && rawUserAnswer === "",
  };
}

/**
 * attempt_number = 1 만 — 1차 시험 답안 단일 컬럼
 */
export function buildAttemptWiseDetailView(result) {
  if (!result) {
    return { column: null, rows: [], isReady: false };
  }

  const { synced, questions, metaByQuestionId } = buildQuestionMetaMap(result);
  const firstSession = getFirstAttemptSession(synced);

  const column = {
    attemptNumber: FIRST_ATTEMPT_NUMBER,
    columnLabel: FIRST_EXAM_ANSWER_COLUMN_LABEL,
    submittedAt: firstSession?.submitted_at ?? synced.submittedAt,
    score: firstSession?.score ?? synced.score,
    total: firstSession?.total ?? synced.total,
  };

  const detailRows = ensureArray(synced.details);
  const rowSource =
    detailRows.length > 0
      ? detailRows
      : ensureArray(firstSession?.records).map((record) => ({
          questionId: record.question_id ?? record.questionId,
          num: record.num,
        }));

  const rows = rowSource
    .map((detail) => {
      const questionKey =
        detail.questionId != null ? String(detail.questionId) : `num-${detail.num}`;
      const meta = metaByQuestionId.get(questionKey);
      const question =
        meta?.question ?? resolveQuestionForDetail(questions, detail);
      const questionId = detail.questionId ?? meta?.questionId;
      const num = detail.num ?? meta?.num;

      const resolved = resolveFirstExamAnswer(synced, { questionId, num });
      const firstExamAnswer = buildAnswerCell(resolved, question);

      return {
        num,
        questionId,
        prompt:
          meta?.prompt ??
          (String(question?.prompt ?? "").trim() || "(문항 정보 없음)"),
        correctAnswer: meta?.correctAnswer ?? (question ? formatQuestionAnswer(question) : "—"),
        firstExamAnswer,
      };
    })
    .sort((a, b) => Number(a.num ?? 0) - Number(b.num ?? 0));

  const isReady = rows.some((row) => row.firstExamAnswer?.status === "found");

  return { column, rows, isReady };
}

/** @deprecated 항상 false — 관리자 상세는 1차만 표시 */
export function hasAttemptWiseHistory() {
  return false;
}

/** @deprecated buildAttemptWiseDetailView 사용 */
export function buildSessionBasedDetailView(result) {
  const view = buildAttemptWiseDetailView(result);
  return {
    ...view,
    columns: view.column ? [view.column] : [],
    sessions: [],
  };
}

export function hasSessionBasedHistory() {
  return false;
}

/** @deprecated buildAttemptWiseDetailView 사용 */
export function buildResultDetailRows(result) {
  const { rows } = buildAttemptWiseDetailView(result);
  return rows.map((row) => ({
    num: row.num,
    questionId: row.questionId,
    prompt: row.prompt,
    correctAnswer: row.correctAnswer,
    correct: row.firstExamAnswer?.isCorrect === true,
    latestStudentAnswer: row.firstExamAnswer?.userAnswer ?? null,
    hasWrongHistory: row.firstExamAnswer?.isCorrect === false,
    wrongAnswerDisplay: row.firstExamAnswer?.userAnswer ?? null,
  }));
}

export function hasMultiAttemptHistory() {
  return false;
}

export { isUserAnswerPresent };
