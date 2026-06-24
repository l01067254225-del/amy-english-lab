/** 시험 응시 시각 캡처 (ISO 문자열) */
export function captureExamTimestamp() {
  return new Date().toISOString();
}

/** ISO 또는 Date → "HH시 mm분 ss초" */
export function formatExamTimeLabel(value) {
  if (value == null || value === "") return "";

  if (typeof value === "string" && /시\s*\d/.test(value)) {
    return value.trim();
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}시 ${m}분 ${s}초`;
}

export function buildExamTimingFields(startTime, endTime) {
  return {
    startTime: startTime || null,
    endTime: endTime || null,
    startTimeLabel: formatExamTimeLabel(startTime) || null,
    endTimeLabel: formatExamTimeLabel(endTime) || null,
  };
}

export function formatExamTimeRange(startTime, endTime, labels = {}) {
  const start =
    labels.startTimeLabel || labels.startLabel || formatExamTimeLabel(startTime);
  const end = labels.endTimeLabel || labels.endLabel || formatExamTimeLabel(endTime);

  if (!start && !end) return "";
  if (start && end) return `${start} ~ ${end}`;
  if (start) return `${start} ~`;
  return `~ ${end}`;
}

export function getExamTimeRangeDisplay(result) {
  if (!result || typeof result !== "object") return "";

  return formatExamTimeRange(result.startTime, result.endTime, {
    startTimeLabel: result.startTimeLabel,
    endTimeLabel: result.endTimeLabel,
  });
}
