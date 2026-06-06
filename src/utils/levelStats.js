import { loadResults } from "./resultsStorage";
import { loadStudents } from "./studentStorage";

function getLatestResultsByStudent(testId) {
  const results = loadResults().filter((result) => result.testId === testId);
  const latestByStudent = new Map();

  results.forEach((result) => {
    const key = result.studentId || result.studentName;
    if (!key) return;

    const existing = latestByStudent.get(key);
    if (
      !existing ||
      new Date(result.submittedAt).getTime() > new Date(existing.submittedAt).getTime()
    ) {
      latestByStudent.set(key, result);
    }
  });

  return latestByStudent;
}

export function getStudentLevel(studentId) {
  const student = loadStudents().find((item) => item.id === studentId);
  return student?.level?.trim() || null;
}

export function getLevelTestAverage(testId, level, { excludeStudentId = null } = {}) {
  if (!testId || !level) {
    return { averageScore: null, sampleSize: 0, total: null };
  }

  const levelStudentIds = new Set(
    loadStudents()
      .filter((student) => student.level === level)
      .map((student) => student.id)
  );

  if (levelStudentIds.size === 0) {
    return { averageScore: null, sampleSize: 0, total: null };
  }

  const latestByStudent = getLatestResultsByStudent(testId);
  const peerResults = [...latestByStudent.entries()]
    .filter(([studentId]) => levelStudentIds.has(studentId))
    .filter(([studentId]) => studentId !== excludeStudentId)
    .map(([, result]) => result);

  if (peerResults.length === 0) {
    return { averageScore: null, sampleSize: 0, total: null };
  }

  const total = peerResults[0]?.total ?? null;
  const averageScore =
    peerResults.reduce((sum, result) => sum + Number(result.score || 0), 0) /
    peerResults.length;

  return {
    averageScore: Math.round(averageScore * 10) / 10,
    sampleSize: peerResults.length,
    total,
  };
}

export function buildLevelCompareFeedback({
  myScore,
  averageScore,
  level,
  sampleSize,
}) {
  if (!level) {
    return "레벨 정보가 없어 동일 레벨 비교를 할 수 없습니다.";
  }
  if (sampleSize === 0 || averageScore == null) {
    return `${level} 레벨 학생의 같은 시험 기록이 아직 없어 비교할 수 없습니다.`;
  }

  const diff = Math.round(myScore - averageScore);
  if (diff > 0) {
    return `현재 ${level} 레벨 평균보다 ${diff}점 높습니다!`;
  }
  if (diff < 0) {
    return `현재 ${level} 레벨 평균보다 ${Math.abs(diff)}점 낮습니다.`;
  }
  return `현재 ${level} 레벨 평균과 동일한 점수입니다!`;
}

export function toPercent(score, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (Number(score) / Number(total)) * 100));
}
