import { loadResults } from "./resultsStorage";
import { ensureArray } from "./safeData";

export function getExamDeploymentInfo(examId) {
  const submissions = ensureArray(loadResults()).filter(
    (result) => result?.testId === examId
  );

  return {
    isDeployed: submissions.length > 0,
    submissionCount: submissions.length,
  };
}
