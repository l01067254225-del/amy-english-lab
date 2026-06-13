import { getExamByTestId } from "./incorrectAnswerClinic";
import { resolveQuestionForDetail } from "./cutoffPolicy";
import { formatTestDate, getTodayDateString } from "./levels";
import { getSubjectLabel } from "./questionBankStorage";
import { ensureArray } from "./safeData";

export const SUBJECT_KEYS = ["vocab", "writing", "grammar", "reading"];

export const SUBJECT_SMS_LABELS = {
  vocab: "단어(Voca)",
  writing: "영작(Writing)",
  grammar: "문법(Grammar)",
  reading: "독해(Reading)",
};

function emptySubjectScores() {
  return { vocab: null, writing: null, grammar: null, reading: null };
}

export function getResultDateKey(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeSubjectScoresFromResult(result) {
  const scores = emptySubjectScores();
  if (!result) return scores;

  const exam = getExamByTestId(result.testId);
  const questions = ensureArray(exam?.questions);
  const details = ensureArray(result.details);

  if (questions.length === 0) return scores;

  const buckets = emptySubjectScores();
  Object.keys(buckets).forEach((key) => {
    buckets[key] = { earned: 0, total: 0 };
  });

  questions.forEach((question, index) => {
    const subject = question?.subject;
    if (!SUBJECT_KEYS.includes(subject)) return;
    buckets[subject].total += 1;
    const detail =
      details.find((item) => item.questionId === question.id) ??
      details.find((item) => item.num === index + 1);
    if (detail?.correct) buckets[subject].earned += 1;
  });

  SUBJECT_KEYS.forEach((subject) => {
    const bucket = buckets[subject];
    if (!bucket || bucket.total === 0) {
      scores[subject] = null;
      return;
    }
    scores[subject] = Math.round((bucket.earned / bucket.total) * 100);
  });

  return scores;
}

export function mergeDailySubjectScores(resultsOnDay) {
  const merged = emptySubjectScores();
  const sorted = [...ensureArray(resultsOnDay)].sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );

  sorted.forEach((result) => {
    const subjectScores = computeSubjectScoresFromResult(result);
    SUBJECT_KEYS.forEach((subject) => {
      if (subjectScores[subject] != null && merged[subject] == null) {
        merged[subject] = subjectScores[subject];
      }
    });
  });

  return merged;
}

export function getStudentResultsOnDate(allResults, studentId, studentName, dateKey) {
  return ensureArray(allResults).filter((result) => {
    if (!result) return false;
    const sameStudent =
      result.studentId === studentId ||
      result.studentName === studentName ||
      result.studentId === studentName;
    if (!sameStudent) return false;
    return getResultDateKey(result.submittedAt) === dateKey;
  });
}

export function formatSubjectScoreValue(score) {
  if (score == null) return "출제 없음";
  return `${score}점`;
}

export function buildDailySmsText({ studentName, level, dateKey, subjectScores }) {
  const scores = subjectScores ?? emptySubjectScores();
  const displayDate = dateKey ? formatTestDate(dateKey) : formatTestDate(getTodayDateString());

  const subjectLines = SUBJECT_KEYS.flatMap((subject) => {
    const score = scores[subject];
    if (score == null) return [];
    return [`- ${SUBJECT_SMS_LABELS[subject]}: ${score}점`];
  });

  return [
    "---",
    "[AMY ENGLISH LAB] 오늘 시험 결과 안내",
    "",
    `지정 레벨: ${level || "-"}`,
    `학생 이름: ${studentName || "-"}`,
    `시험 날짜: ${displayDate}`,
    "",
    "■ 영역별 성적 (100점 만점 기준)",
    ...subjectLines,
    "---",
  ].join("\n");
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function getStudentResultsInPeriod(
  allResults,
  studentId,
  studentName,
  periodDays = 30,
  endDate = new Date()
) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (periodDays - 1));
  start.setHours(0, 0, 0, 0);

  return ensureArray(allResults)
    .filter((result) => {
      if (!result) return false;
      const sameStudent =
        result.studentId === studentId ||
        result.studentName === studentName ||
        result.studentId === studentName;
      if (!sameStudent) return false;
      const time = new Date(result.submittedAt).getTime();
      return !Number.isNaN(time) && time >= start.getTime() && time <= end.getTime();
    })
    .sort(
      (a, b) =>
        new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );
}

export function aggregateSubjectAverages(results) {
  const buckets = {
    vocab: [],
    writing: [],
    grammar: [],
    reading: [],
  };

  ensureArray(results).forEach((result) => {
    const subjectScores = computeSubjectScoresFromResult(result);
    SUBJECT_KEYS.forEach((subject) => {
      if (subjectScores[subject] != null) {
        buckets[subject].push(subjectScores[subject]);
      }
    });
  });

  const averages = emptySubjectScores();
  SUBJECT_KEYS.forEach((subject) => {
    const values = buckets[subject];
    if (values.length === 0) {
      averages[subject] = null;
      return;
    }
    averages[subject] = Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length
    );
  });

  return averages;
}

export function buildScoreHistoryTimeline(results) {
  return ensureArray(results).map((result) => {
    const total = Number(result.total) || 0;
    const score = Number(result.score) || 0;
    const subjectScores = computeSubjectScoresFromResult(result);

    return {
      id: result.id,
      dateKey: getResultDateKey(result.submittedAt),
      dateLabel: formatTestDate(getResultDateKey(result.submittedAt)),
      testTitle: result.testTitle || "-",
      score,
      total,
      percent: total > 0 ? Math.round((score / total) * 100) : 0,
      subjectScores,
      subjectSummary: SUBJECT_KEYS.filter((key) => subjectScores[key] != null)
        .map((key) => `${getSubjectLabel(key)} ${subjectScores[key]}점`)
        .join(" · "),
    };
  });
}

export function getPeriodRangeLabel(periodDays, endDate = new Date()) {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - (periodDays - 1));
  return `${formatTestDate(getResultDateKey(start.toISOString()))} ~ ${formatTestDate(getResultDateKey(end.toISOString()))}`;
}
