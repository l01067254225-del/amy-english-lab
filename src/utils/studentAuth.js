const SESSION_KEY = "amy-test-student-session";

export function getStudentSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStudentSession(student) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: student.id,
      name: student.name,
      level: student.level ?? "",
    })
  );
}

export function clearStudentSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
