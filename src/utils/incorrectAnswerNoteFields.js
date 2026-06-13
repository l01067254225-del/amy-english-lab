/** vocab/writing: 1줄 · grammar/reading: 3줄 */
export function getCorrectionFieldRows(subject) {
  if (subject === "grammar" || subject === "reading") {
    return 3;
  }
  return 1;
}

export function getCorrectionFieldMinHeight(subject) {
  const rows = getCorrectionFieldRows(subject);
  if (rows >= 3) return 72;
  return 28;
}
