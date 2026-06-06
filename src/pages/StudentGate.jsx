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
  const [retestResultId, setRetestResultId] = useState(null);

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
    return (
      <div style={fallbackPageStyle}>
        <p style={{ margin: 0, color: "#64748b" }}>로그인 정보를 확인하는 중...</p>
      </div>
    );
  }

  if (!session.id) {
    return (
      <div style={fallbackPageStyle}>
        <div style={fallbackCardStyle}>
          <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>세션 오류</h2>
          <p style={{ margin: "0 0 16px", color: "#64748b", lineHeight: 1.6 }}>
            학생 로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.
          </p>
          <button type="button" onClick={handleLogout} style={fallbackBtnStyle}>
            로그인 화면으로
          </button>
        </div>
      </div>
    );
  }

  if (view === "exam" && activeExamId) {
    return (
      <StudentExamTake
        student={session}
        examId={activeExamId}
        isRetest={Boolean(retestResultId)}
        retestResultId={retestResultId}
        onBack={() => {
          if (retestResultId) {
            setActiveExamId(null);
            setView("result");
            return;
          }
          setActiveExamId(null);
          setRetestResultId(null);
          setView("dashboard");
        }}
        onSubmitted={(resultId) => {
          setActiveResultId(resultId);
          setRetestResultId(null);
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
          setRetestResultId(null);
          setView("dashboard");
        }}
        onRetest={(examId, resultId) => {
          setRetestResultId(resultId);
          setActiveExamId(examId);
          setView("exam");
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
        setRetestResultId(null);
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

const fallbackPageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  fontFamily: "'Segoe UI', Arial, sans-serif",
};

const fallbackCardStyle = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  maxWidth: 420,
  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
  textAlign: "center",
};

const fallbackBtnStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};
