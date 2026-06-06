import { getStudentSession } from "./studentAuth";
import { isTeacherAuthed } from "./teacherAuth";

export function resolveInitialAuthView() {
  if (isTeacherAuthed()) return "teacher";
  if (getStudentSession()) return "student";
  return "login";
}

export function bootstrapAuthSession() {
  return {
    view: resolveInitialAuthView(),
    student: getStudentSession(),
    teacherAuthed: isTeacherAuthed(),
  };
}
