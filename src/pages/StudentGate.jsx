import { useEffect, useState } from "react";
import { getStudentSession, clearStudentSession } from "../utils/studentAuth";
import StudentDashboard from "./student/StudentDashboard";
import StudentExamTake from "./student/StudentExamTake";
import StudentTestResult from "./student/StudentTestResult";

export default function StudentGate({ onBack }) {
  const session = getStudentSession();
  const [view, setView] = useState("dashboard");
  const [activeExamId, setActiveExamId] = useState(null);
  const [activeResultId, setActiveResultId] = useState(null);

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

  if (view === "exam" && activeExamId) {
    return (
      <StudentExamTake
        student={session}
        examId={activeExamId}
        onBack={() => {
          setActiveExamId(null);
          setView("dashboard");
        }}
        onSubmitted={(resultId) => {
          setActiveResultId(resultId);
          setView("result");
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (view === "result" && activeResultId) {
    return (
      <StudentTestResult
        student={session}
        resultId={activeResultId}
        onBack={() => {
          setActiveResultId(null);
          setView("dashboard");
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <StudentDashboard
      student={session}
      onLogout={handleLogout}
      onStartExam={(examId) => {
        setActiveExamId(examId);
        setView("exam");
      }}
      onViewResult={(resultId) => {
        setActiveResultId(resultId);
        setView("result");
      }}
    />
  );
}
