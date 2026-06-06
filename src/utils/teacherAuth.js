const AUTH_KEY = "amy-test-teacher-auth";
const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "1234";

export function isTeacherAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function setTeacherSession() {
  sessionStorage.setItem(AUTH_KEY, "true");
}

export function clearTeacherSession() {
  sessionStorage.removeItem(AUTH_KEY);
}

export function verifyAdmin(id, password) {
  return (id ?? "").trim() === ADMIN_ID && (password ?? "") === ADMIN_PASSWORD;
}
