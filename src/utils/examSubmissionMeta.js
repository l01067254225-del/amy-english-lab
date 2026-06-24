import { getTodayDateString } from "./levels";
import { compareDateKeys, getExamEndDate } from "./examAvailability";

export const SUBMISSION_STATUS = {
  REGULAR: "regular",
  LATE: "late_submission",
  REVIEW: "review",
};

export function buildExamSubmissionMeta(
  exam,
  { isReviewMode = false, submittedAt } = {}
) {
  const submittedIso = submittedAt ?? new Date().toISOString();
  const submitDateKey = submittedIso.slice(0, 10);
  const today = getTodayDateString();
  const scheduledTestDate = String(exam?.testDate ?? "").trim();
  const endDate = getExamEndDate(exam);

  const pastEndDate = Boolean(endDate) && compareDateKeys(today, endDate) > 0;
  const submitAfterSchedule =
    Boolean(scheduledTestDate) &&
    compareDateKeys(submitDateKey, scheduledTestDate) > 0;

  let submissionStatus = SUBMISSION_STATUS.REGULAR;
  let isReview = false;
  let isLateSubmission = false;

  if (isReviewMode) {
    submissionStatus = SUBMISSION_STATUS.REVIEW;
    isReview = true;
  } else if (pastEndDate || submitAfterSchedule) {
    submissionStatus = SUBMISSION_STATUS.LATE;
    isLateSubmission = true;
  }

  return {
    scheduledTestDate,
    endDate,
    submissionStatus,
    isReview,
    isLateSubmission,
  };
}

export function formatSubmissionStatusLabel(result) {
  if (!result) return "정규 응시";

  const status = String(result.submissionStatus ?? "").trim();
  if (result.isReview || status === SUBMISSION_STATUS.REVIEW) {
    return "복습 응시";
  }
  if (result.isLateSubmission || status === SUBMISSION_STATUS.LATE) {
    return "기한 후 응시";
  }
  return "정규 응시";
}

export function getSubmissionStatusBadgeStyle(result) {
  const label = formatSubmissionStatusLabel(result);
  if (label === "복습 응시") {
    return { background: "#f5f3ff", color: "#6d28d9" };
  }
  if (label === "기한 후 응시") {
    return { background: "#fff7ed", color: "#c2410c" };
  }
  return { background: "#ecfdf5", color: "#047857" };
}
