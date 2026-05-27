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

export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
