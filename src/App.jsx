import { useEffect, useState } from "react";
import StudentGate from "./pages/StudentGate";
import StudentLogin from "./pages/StudentLogin";
import TeacherApp from "./pages/TeacherApp";
import { fetchStudentUser } from "./services/studentsApi";
import { bootstrapAuthSession } from "./utils/authSession";
import { setStudentSession, clearStudentSession } from "./utils/studentAuth";
import { findStudent } from "./data/students";
import {
  setTeacherSession,
  clearTeacherSession,
  verifyAdmin,
} from "./utils/teacherAuth";
import { clearStudentGateState } from "./utils/studentGateStorage";

export default function App() {
  const [view, setView] = useState("login");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const session = bootstrapAuthSession();
    setView(session.view);
    setAuthReady(true);
  }, []);

  const handleLogin = async (id, password) => {
    if (verifyAdmin(id, password)) {
      clearStudentSession();
      clearStudentGateState();
      setTeacherSession();
      setView("teacher");
      return null;
    }

    const student = findStudent(id, password);
    if (!student) {
      return "아이디 또는 비밀번호가 틀렸습니다.";
    }

    clearTeacherSession();

    let mergedStudent = student;
    try {
      const remoteProfile = await fetchStudentUser(student.id);
      if (remoteProfile) {
        mergedStudent = {
          ...student,
          name: remoteProfile.name || student.name,
          level: remoteProfile.level || student.level,
        };
      }
    } catch (error) {
      console.warn("Failed to fetch latest student profile on login:", error);
    }

    setStudentSession(mergedStudent);
    setView("student");
    return null;
  };

  const handleBackToLogin = () => {
    clearTeacherSession();
    clearStudentSession();
    clearStudentGateState();
    setView("login");
  };

  if (!authReady) {
    return (
      <div style={bootScreenStyle}>
        <p style={bootTextStyle}>로그인 정보를 확인하는 중...</p>
      </div>
    );
  }

  if (view === "student") {
    return <StudentGate onBack={handleBackToLogin} />;
  }

  if (view === "teacher") {
    return <TeacherApp onBack={handleBackToLogin} />;
  }

  return <StudentLogin onLogin={handleLogin} />;
}

const bootScreenStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f5f7fb",
  fontFamily: "'Segoe UI', Arial, sans-serif",
};

const bootTextStyle = {
  margin: 0,
  color: "#64748b",
  fontWeight: 600,
};
