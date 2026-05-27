import { useState } from "react";
import { getStudentSession, clearStudentSession } from "../utils/studentAuth";
import StudentLogin from "./StudentLogin";
import StudentApp from "./StudentApp";

export default function StudentGate() {
  const [session, setSession] = useState(() => getStudentSession());

  const handleLogout = () => {
    clearStudentSession();
    setSession(null);
  };

  if (!session) {
    return <StudentLogin onLogin={() => setSession(getStudentSession())} />;
  }

  return <StudentApp student={session} onLogout={handleLogout} />;
}
