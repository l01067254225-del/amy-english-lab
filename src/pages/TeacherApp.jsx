import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { STUDENTS } from "../data/students";
import { clearAllResults, fetchAllResults, formatDate } from "../services/resultsApi";
import {
  clearTeacherSession,
  isTeacherAuthed,
  setTeacherSession,
  verifyAdmin,
} from "../utils/teacherAuth";

export default function TeacherApp({ onBack }) {
  const [authed, setAuthed] = useState(() => isTeacherAuthed());
  const [teacherId, setTeacherId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // 선생님이 로그인하면 localStorage에서 저장된 결과를 불러옵니다.
  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllResults();
      setResults(data);
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

  const studentSummary = useMemo(() => {
    return STUDENTS.map((student) => {
      const studentResults = results
        .filter((r) => r.studentId === student.id)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      const latest = studentResults[0] || null;
      return {
        ...student,
        submitted: studentResults.length > 0,
        latest,
      };
    });
  }, [results]);

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
          subtitle="학생 점수를 한눈에 확인하고 제출 내역을 관리합니다"
          onLogout={logout}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {onBack && (
            <button type="button" onClick={onBack} style={btnSecondary}>
              돌아가기
            </button>
          )}
          <button type="button" onClick={loadResults} style={btnSecondary} disabled={loading}>
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            style={{ ...btnSecondary, color: "#b91c1c", borderColor: "#fecaca" }}
          >
            전체 성적 삭제
          </button>
        </div>

        <div style={dashboardGrid}>
          <div style={summaryCard}>
            <h2 style={sectionTitle}>학생 제출 현황</h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>학생 이름</th>
                  <th style={thTdStyle}>ID</th>
                  <th style={thTdStyle}>제출 여부</th>
                  <th style={thTdStyle}>최신 점수</th>
                  <th style={thTdStyle}>시험</th>
                  <th style={thTdStyle}>제출 시간</th>
                </tr>
              </thead>
              <tbody>
                {studentSummary.map((row) => (
                  <tr key={row.id}>
                    <td style={thTdStyle}>{row.name}</td>
                    <td style={thTdStyle}>{row.id}</td>
                    <td style={thTdStyle}>{row.submitted ? "제출" : "미제출"}</td>
                    <td style={thTdStyle}>{row.latest ? `${row.latest.score}/${row.latest.total}` : "-"}</td>
                    <td style={thTdStyle}>{row.latest?.testTitle ?? "-"}</td>
                    <td style={thTdStyle}>{row.latest ? formatDate(row.latest.submittedAt) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={summaryCard}>
            <h2 style={sectionTitle}>전체 제출 내역</h2>
            {results.length === 0 ? (
              <p style={{ margin: 0, color: "#64748b" }}>
                아직 제출된 시험이 없습니다.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thTdStyle}>학생</th>
                      <th style={thTdStyle}>시험</th>
                      <th style={thTdStyle}>점수</th>
                      <th style={thTdStyle}>제출 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item) => (
                      <tr key={item.id}>
                        <td style={thTdStyle}>{item.studentName}</td>
                        <td style={thTdStyle}>{item.testTitle}</td>
                        <td style={thTdStyle}>{item.score}/{item.total}</td>
                        <td style={thTdStyle}>{formatDate(item.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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

const btnSecondary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 700,
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

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const summaryCard = {
  background: "white",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
};

const sectionTitle = {
  margin: "0 0 16px",
  fontSize: 18,
  color: "#0f172a",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thTdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  textAlign: "left",
};
