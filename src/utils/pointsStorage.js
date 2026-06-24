const POINTS_KEY = "amy-test-student-points";
const HISTORY_KEY = "amy-test-point-history";

export function normalizePoints(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

export function formatPointsDisplay(points) {
  return `${normalizePoints(points).toLocaleString("ko-KR")}P`;
}

function readPointsMap() {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePointsMap(map) {
  localStorage.setItem(POINTS_KEY, JSON.stringify(map));
}

function readHistoryList() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistoryList(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function loadLocalStudentPoints(studentLoginId) {
  const id = String(studentLoginId ?? "").trim();
  if (!id) return 0;
  const map = readPointsMap();
  return normalizePoints(map[id]?.points);
}

export function saveLocalStudentPoints(studentLoginId, points) {
  const id = String(studentLoginId ?? "").trim();
  if (!id) return 0;

  const map = readPointsMap();
  const nextPoints = normalizePoints(points);
  map[id] = {
    points: nextPoints,
    updatedAt: new Date().toISOString(),
  };
  writePointsMap(map);
  window.dispatchEvent(new CustomEvent("amy-points-updated", { detail: { studentId: id } }));
  return nextPoints;
}

export function loadLocalPointHistory(studentLoginId, { limit = 50 } = {}) {
  const id = String(studentLoginId ?? "").trim();
  if (!id) return [];

  return readHistoryList()
    .filter((entry) => entry?.studentId === id)
    .sort(
      (a, b) =>
        new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
    )
    .slice(0, limit);
}

export function hasLocalPointReward(studentLoginId, sourceType, sourceId) {
  const id = String(studentLoginId ?? "").trim();
  if (!id || !sourceType || !sourceId) return false;

  return readHistoryList().some(
    (entry) =>
      entry?.studentId === id &&
      entry?.sourceType === sourceType &&
      entry?.sourceId === String(sourceId)
  );
}

export function appendLocalPointHistory(studentLoginId, entry) {
  const id = String(studentLoginId ?? "").trim();
  if (!id) return null;

  const historyEntry = {
    id: entry.id ?? `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    studentId: id,
    delta: Number(entry.delta) || 0,
    reason: String(entry.reason ?? "").trim(),
    date: String(entry.date ?? "").trim(),
    sourceType: String(entry.sourceType ?? "").trim(),
    sourceId: String(entry.sourceId ?? "").trim(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };

  const next = [historyEntry, ...readHistoryList()];
  writeHistoryList(next);
  window.dispatchEvent(new CustomEvent("amy-points-updated", { detail: { studentId: id } }));
  return historyEntry;
}
