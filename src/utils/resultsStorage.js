export const STORAGE_KEY = "amy-test-results";

export function loadResults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResult(record) {
  const results = loadResults();
  const next = [record, ...results];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearResults() {
  localStorage.removeItem(STORAGE_KEY);
}

export function replaceResult(resultId, record) {
  const results = loadResults();
  const index = results.findIndex((item) => item.id === resultId);
  const nextRecord = { ...record, id: resultId };

  if (index < 0) {
    const next = [nextRecord, ...results];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  const next = [...results];
  next[index] = nextRecord;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function formatDate(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
