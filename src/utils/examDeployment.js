import { loadResults } from "./resultsStorage";
import { ensureArray } from "./safeData";

export function getExamDeploymentInfo(examId) {
  const submissions = ensureArray(loadResults()).filter(
    (result) => result?.testId === examId
  );

  const lateCount = submissions.filter(
    (result) => result?.isLateSubmission || result?.submissionStatus === "late_submission"
  ).length;
  const reviewCount = submissions.filter(
    (result) => result?.isReview || result?.submissionStatus === "review"
  ).length;
  const regularCount = submissions.filter(
    (result) =>
      !result?.isLateSubmission &&
      !result?.isReview &&
      result?.submissionStatus !== "late_submission" &&
      result?.submissionStatus !== "review"
  ).length;

  return {
    isDeployed: submissions.length > 0,
    submissionCount: submissions.length,
    regularCount: Math.max(0, regularCount),
    lateCount,
    reviewCount,
  };
}
