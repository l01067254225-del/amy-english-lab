export const LEVEL_OPTIONS = [
  "A2-1",
  "A2-2",
  "A1-1",
  "A1-2",
  "PA1-1",
  "PA1-2",
  "HB1-1",
  "HB1-2",
];

export function getTodayDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTestDate(dateString) {
  if (!dateString) return "";
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return dateString;
  return `${y}년 ${m}월 ${d}일`;
}
