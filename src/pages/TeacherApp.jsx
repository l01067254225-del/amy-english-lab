import { useCallback, useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { clearAllResults, fetchAllResults } from "../services/resultsApi";
import { loadStudents } from "../utils/studentStorage";
import { ensureArray } from "../utils/safeData";
import {
  clearTeacherSession,
  isTeacherAuthed,
  setTeacherSession,
  verifyAdmin,
} from "../utils/teacherAuth";
import TeacherExamBuilderTab from "./teacher/TeacherExamBuilderTab";
import TeacherQuestionBankTab from "./teacher/TeacherQuestionBankTab";
import TeacherResultsTab from "./teacher/TeacherResultsTab";
import TeacherStudentManagementTab from "./teacher/TeacherStudentManagementTab";
import { btnSecondary } from "./teacher/teacherStyles";

const TABS = [
  { id: "results", label: "성적 조회" },
  { id: "students", label: "학생 계정 관리" },
  { id: "questionBank", label: "문제은행 관리" },
  { id: "examBuilder", label: "시험 생성" },
];

export default function TeacherApp({ onBack }) {
  const [authed, setAuthed] = useState(() => isTeacherAuthed());
  const [activeTab, setActiveTab] = useState("results");
  const [teacherId, setTeacherId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState(() => ensureArray(loadStudents()));
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllResults();
      setResults(ensureArray(data));
    } catch (error) {
      console.error(error);
      alert("성적을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadResults();
    }
  }, [authed, loadResults]);

  const login = (e) => {
    e.preventDefault();
    if (verifyAdmin(teacherId, password)) {
      setTeacherSession();
      setAuthed(true);
      setLoginError("");
      return;
    }
    setLoginError("아이디 또는 비밀번호가 틀렸습니다.");
  };

  const logout = () => {
    clearTeacherSession();
    setAuthed(false);
    setTeacherId("");
    setPassword("");
    setLoginError("");
    if (onBack) {
      onBack();
    }
  };

  const handleClearAll = async () => {
    if (!results.length) return;
    if (!confirm("모든 학생 성적을 삭제할까요?")) return;
    await clearAllResults();
    setResults([]);
  };

  if (!authed) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 420, margin: "80px auto", ...cardStyle }}>
          <h1 style={{ marginTop: 0 }}>교사 로그인</h1>
          <p style={{ color: "#64748b", lineHeight: 1.7 }}>
            관리자 계정으로 로그인하면 학생들의 제출 상태와 점수를 확인할 수 있습니다.
          </p>
          <form onSubmit={login}>
            <label style={labelStyle}>
              아이디
              <input
                type="text"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="admin"
                style={inputStyle}
                autoComplete="username"
              />
            </label>
            <label style={labelStyle}>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1234"
                style={inputStyle}
                autoComplete="current-password"
              />
            </label>
            {loginError && (
              <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>
                {loginError}
              </p>
            )}
            <button type="submit" style={{ ...btnPrimary, width: "100%" }}>
              로그인
            </button>
          </form>
          {onBack && (
            <button type="button" onClick={onBack} style={backButtonStyle}>
              이전으로
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SiteHeader
          title="교사용 관리자 페이지"
          subtitle="성적 조회, 학생 계정, 문제은행, 시험 생성을 한곳에서 관리합니다"
          onLogout={logout}
        />

        {onBack && (
          <button type="button" onClick={onBack} style={{ ...btnSecondary, marginBottom: 16 }}>
            돌아가기
          </button>
        )}

        <div style={tabBarStyle}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...tabButtonStyle,
                ...(activeTab === tab.id ? tabButtonActiveStyle : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "results" && (
          <TeacherResultsTab
            students={students}
            results={results}
            loading={loading}
            onRefresh={loadResults}
            onClearAll={handleClearAll}
          />
        )}
        {activeTab === "students" && (
          <TeacherStudentManagementTab
            onStudentsChange={(next) => setStudents(ensureArray(next))}
          />
        )}
        {activeTab === "questionBank" && <TeacherQuestionBankTab />}
        {activeTab === "examBuilder" && <TeacherExamBuilderTab />}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const cardStyle = {
  background: "white",
  borderRadius: 14,
  padding: 22,
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
};

const labelStyle = {
  display: "block",
  marginBottom: 14,
  color: "#334155",
  fontWeight: 700,
  fontSize: 14,
};

const inputStyle = {
  width: "100%",
  padding: 12,
  marginTop: 8,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: 15,
};

const btnPrimary = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
};

const backButtonStyle = {
  marginTop: 12,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
};

const tabBarStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 20,
  padding: 6,
  background: "white",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

const tabButtonStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const tabButtonActiveStyle = {
  background: "#2563eb",
  color: "white",
};
