import { useState } from "react";
import StudentGate from "./pages/StudentGate";
import StudentLogin from "./pages/StudentLogin";
import TeacherApp from "./pages/TeacherApp";
import { setStudentSession } from "./utils/studentAuth";
import { findStudent } from "./data/students";
import { setTeacherSession, clearTeacherSession, verifyAdmin } from "./utils/teacherAuth";

export default function App() {
  const [view, setView] = useState("login");

  const handleLogin = (id, password) => {
    if (verifyAdmin(id, password)) {
      setTeacherSession();
      setView("teacher");
      return;
    }

    const student = findStudent(id, password);
    if (!student) {
      return "아이디 또는 비밀번호가 틀렸습니다.";
    }

    setStudentSession(student);
    setView("student");
    return null;
  };

  const handleBackToLogin = () => {
    clearTeacherSession();
    setView("login");
  };

  if (view === "student") {
    return <StudentGate onBack={handleBackToLogin} />;
  }

  if (view === "teacher") {
    return <TeacherApp onBack={handleBackToLogin} />;
  }

  return <StudentLogin onLogin={handleLogin} />;
}
