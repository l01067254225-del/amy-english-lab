import { ensureArray } from "./safeData";

export const EXAM_SUBMISSION_INCOMPLETE_MESSAGE =
  "모든 문항에 답변을 입력해 주세요.";

export class ExamSubmissionValidationError extends Error {
  constructor(message = EXAM_SUBMISSION_INCOMPLETE_MESSAGE) {
    super(message);
    this.name = "ExamSubmissionValidationError";
  }
}

export function isAnswerProvided(value) {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

export function validateExamAnswers(questions, answers) {
  const safeQuestions = ensureArray(questions);
  const missing = safeQuestions.filter(
    (question) => !isAnswerProvided(answers?.[question.id])
  );

  return {
    valid: missing.length === 0,
    missingCount: missing.length,
    missingQuestionIds: missing.map((question) => question.id),
  };
}

export function validateResultSubmission(record) {
  const total = Number(record?.total ?? 0);
  if (total <= 0) {
    throw new ExamSubmissionValidationError("시험 문항 정보가 올바르지 않습니다.");
  }

  const details = ensureArray(record?.details);
  if (details.length !== total) {
    throw new ExamSubmissionValidationError(EXAM_SUBMISSION_INCOMPLETE_MESSAGE);
  }

  const answers = record?.answers ?? record?.responses;
  if (!answers || typeof answers !== "object") {
    throw new ExamSubmissionValidationError(EXAM_SUBMISSION_INCOMPLETE_MESSAGE);
  }

  const unanswered = details.filter((detail) => {
    const fromDetail = detail.userAnswer ?? detail.studentAnswer;
    const fromMap = answers[detail.questionId];
    return !isAnswerProvided(fromDetail) && !isAnswerProvided(fromMap);
  });
  if (unanswered.length > 0) {
    throw new ExamSubmissionValidationError(EXAM_SUBMISSION_INCOMPLETE_MESSAGE);
  }

  return true;
}

export function stripAnswersFromResultRecord(record) {
  if (!record || typeof record !== "object") return record;
  const { answers, responses, ...rest } = record;
  return rest;
}
