const AUTH_KEY = "amy-test-teacher-auth";
const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "1234";

function readTeacherAuthFrom(storage) {
  return storage.getItem(AUTH_KEY) === "true";
}

export function isTeacherAuthed() {
  if (readTeacherAuthFrom(localStorage)) return true;

  if (readTeacherAuthFrom(sessionStorage)) {
    setTeacherSession();
    sessionStorage.removeItem(AUTH_KEY);
    return true;
  }

  return false;
}

export function setTeacherSession() {
  localStorage.setItem(AUTH_KEY, "true");
  sessionStorage.removeItem(AUTH_KEY);
}

export function clearTeacherSession() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
}

export function verifyAdmin(id, password) {
  return (id ?? "").trim() === ADMIN_ID && (password ?? "") === ADMIN_PASSWORD;
}
