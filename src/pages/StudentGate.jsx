import { useEffect } from "react";
import { getStudentSession, clearStudentSession } from "../utils/studentAuth";
import StudentApp from "./StudentApp";

export default function StudentGate({ onBack }) {
  const session = getStudentSession();

  useEffect(() => {
    if (!session) {
      onBack?.();
    }
  }, [session, onBack]);

  const handleLogout = () => {
    clearStudentSession();
    onBack?.();
  };

  if (!session) {
    return null;
  }

  return <StudentApp student={session} onLogout={handleLogout} />;
}
