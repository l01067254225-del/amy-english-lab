import { useEffect, useState } from "react";
import StudentGate from "./pages/StudentGate";
import StudentLogin from "./pages/StudentLogin";
import TeacherApp from "./pages/TeacherApp";
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

  const handleLogin = (id, password) => {
    if (verifyAdmin(id, password)) {
      clearStudentSession();
      clearStudentGateState();
      setTeacherSession();
      setView("teacher");
      return;
    }

    const student = findStudent(id, password);
    if (!student) {
      return "아이디 또는 비밀번호가 틀렸습니다.";
    }

    clearTeacherSession();
    setStudentSession(student);
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
git add .
git commit -m "문제 데이터 강제 그룹화 및 세트 단위 선택 방식 UI 전면 적용"
git push origin main
git add .
git commit-m "UI 강제 개편: 개별 문항 나열 제거 및 시험 자료명(세트) 선택 UI 적용"
git push origin main
