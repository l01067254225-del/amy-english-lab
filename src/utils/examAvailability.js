import { getTodayDateString } from "./levels";
import { ensureArray } from "./safeData";

const EXAM_SETS_KEY = "amy-test-exam-sets";

function readExamSetsFromStorage() {
  try {
    const raw = localStorage.getItem(EXAM_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return ensureArray(parsed);
  } catch {
    return [];
  }
}

/** YYYY-MM-DD 문자열 비교 */
export function compareDateKeys(left, right) {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

export function getExamEndDate(exam) {
  return String(exam?.endDate ?? exam?.testDate ?? "").trim();
}

export function isExamScheduledFuture(exam, today = getTodayDateString()) {
  const testDate = String(exam?.testDate ?? "").trim();
  return Boolean(testDate) && compareDateKeys(testDate, today) > 0;
}

export function isExamScheduledPast(exam, today = getTodayDateString()) {
  const endDate = getExamEndDate(exam);
  return Boolean(endDate) && compareDateKeys(endDate, today) < 0;
}

export function isExamScheduledToday(exam, today = getTodayDateString()) {
  const testDate = String(exam?.testDate ?? "").trim();
  return Boolean(testDate) && testDate === today;
}

export function getExamsForStudentLevel(level) {
  const studentLevel = String(level ?? "").trim();
  if (!studentLevel) return [];

  return readExamSetsFromStorage()
    .filter(
      (exam) =>
        exam?.targetLevel === studentLevel &&
        ensureArray(exam?.questions).length > 0
    )
    .sort((a, b) => compareDateKeys(b?.testDate, a?.testDate));
}

export function getStudentExamCatalog(level, today = getTodayDateString()) {
  const exams = getExamsForStudentLevel(level);
  const activeExams = [];
  const pastExams = [];

  exams.forEach((exam) => {
    if (isExamScheduledPast(exam, today)) {
      pastExams.push(exam);
    } else {
      activeExams.push(exam);
    }
  });

  return { activeExams, pastExams, allExams: exams };
}

export function resolveExamStartAction(exam, status, today, { section = "active" } = {}) {
  const hasAttempt = Boolean(status?.hasAttempt);
  const complete = Boolean(status?.complete);

  if (section === "past") {
    return {
      disabled: false,
      label: hasAttempt ? "복습하기" : "시험 시작",
      reviewMode: hasAttempt,
    };
  }

  if (isExamScheduledFuture(exam, today)) {
    return {
      disabled: true,
      label: "예정",
      reviewMode: false,
    };
  }

  if (complete) {
    return {
      disabled: false,
      label: "복습하기",
      reviewMode: true,
    };
  }

  return {
    disabled: false,
    label: hasAttempt ? "이어 풀기" : "시험 시작",
    reviewMode: false,
  };
}
