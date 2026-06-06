const SESSION_KEY = "amy-test-student-session";

function readSessionFrom(storage) {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return {
      id: String(parsed.id).trim(),
      name: String(parsed.name ?? parsed.id).trim(),
      level: String(parsed.level ?? "").trim(),
    };
  } catch {
    return null;
  }
}

export function getStudentSession() {
  const fromLocal = readSessionFrom(localStorage);
  if (fromLocal) return fromLocal;

  const fromSession = readSessionFrom(sessionStorage);
  if (fromSession) {
    setStudentSession(fromSession);
    sessionStorage.removeItem(SESSION_KEY);
    return fromSession;
  }

  return null;
}

export function setStudentSession(student) {
  const payload = {
    id: student.id,
    name: student.name,
    level: student.level ?? "",
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  sessionStorage.removeItem(SESSION_KEY);
}

export function clearStudentSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
