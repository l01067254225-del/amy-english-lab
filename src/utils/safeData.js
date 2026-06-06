export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeString(value, fallback = "") {
  if (value == null) return fallback;
  return String(value);
}
