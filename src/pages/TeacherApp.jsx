import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { TESTS } from "../data/questions";
import {
  clearAllResults,
  deleteResult,
  fetchAllResults,
  formatDate,
} from "../services/resultsApi";

const TEACHER_PIN = import.meta.env.VITE_TEACHER_PIN || "1234";
const AUTH_KEY = "amy-test-teacher-auth";

export default function TeacherApp() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === "true"
  );
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTest, setFilterTest] = useState("all");
  const [searchName, setSearchName] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllResults();
      setResults(data);
      setSelectedId((prev) => {
        if (prev && data.some((item) => item.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      alert("성적을 불러오지 못했습니다. Firebase 설정을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadResults();
  }, [authed, loadResults]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      const matchTest = filterTest === "all" || r.testId === filterTest;
      const matchName = r.studentName
        .toLowerCase()
        .includes(searchName.trim().toLowerCase());
      return matchTest && matchName;
    });
  }, [results, filterTest, searchName]);

  const selected =
    filtered.find((r) => r.id === selectedId) ??
    filtered[0] ??
    null;

  const stats = useMemo(() => {
    const byTest = {};
    for (const test of TESTS) {
      const list = results.filter((r) => r.testId === test.id);
      if (!list.length) {
        byTest[test.id] = null;
        continue;
      }
      const avg = list.reduce((sum, r) => sum + r.score / r.total, 0) / list.length;
      byTest[test.id] = {
        count: list.length,
        avgPercent: Math.round(avg * 100),
      };
    }
    return byTest;
  }, [results]);

  const login = (e) => {
    e.preventDefault();
    if (pinInput === TEACHER_PIN) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
      setPinError("");
    } else {
      setPinError("비밀번호가 틀렸습니다.");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPinInput("");
  };

  const handleDelete = async (id) => {
    if (!confirm("이 성적을 삭제할까요?")) return;
    const next = await deleteResult(id);
    setResults(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const handleClearAll = async () => {
    if (!results.length) return;
    if (!confirm("모든 학생 성적을 삭제할까요?")) return;
    const next = await clearAllResults();
    setResults(next);
    setSelectedId(null);
  };

  if (!authed) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 400, margin: "80px auto", ...cardStyle }}>
          <h1 style={{ marginTop: 0 }}>AMY ENGLISH LAB 교사용</h1>
          <p style={{ color: "#64748b", lineHeight: 1.5 }}>
            비밀번호를 입력하면 학생들이 제출한 성적을 볼 수 있습니다.
          </p>
          <form onSubmit={login}>
            <input
              type="password"
              placeholder="교사 비밀번호"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={inputStyle}
            />
            {pinError && (
              <p style={{ color: "#b91c1c", margin: "8px 0 0", fontSize: 14 }}>{pinError}</p>
            )}
            <button type="submit" style={{ ...btnPrimary, width: "100%", marginTop: 12 }}>
              입장
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SiteHeader
          title="AMY ENGLISH LAB 교사용"
          subtitle="학생이 제출한 시험 성적을 실시간으로 확인합니다"
          isTeacher
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={loadResults} style={btnSecondary} disabled={loading}>
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
          <button type="button" onClick={logout} style={btnSecondary}>
            로그아웃
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            style={{ ...btnSecondary, color: "#b91c1c", borderColor: "#fecaca" }}
          >
            전체 삭제
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {TESTS.map((t) => (
            <div key={t.id} style={{ ...cardStyle, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>{t.title}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>
                {stats[t.id] ? `${stats[t.id].avgPercent}점` : "-"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {stats[t.id] ? `${stats[t.id].count}명 응시` : "응시 없음"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={filterTest}
            onChange={(e) => setFilterTest(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 160 }}
          >
            <option value="all">전체 시험</option>
            {TESTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <input
            placeholder="학생 이름 검색"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>성적 불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: "#94a3b8" }}>
              {results.length === 0
                ? "아직 제출된 시험이 없습니다."
                : "검색 조건에 맞는 성적이 없습니다."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(300px, 1fr) minmax(260px, 360px)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>
                제출 목록 ({filtered.length}건)
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {filtered.map((r) => (
                  <li key={r.id} style={{ marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border:
                          selected?.id === r.id
                            ? "2px solid #2563eb"
                            : "1px solid #e2e8f0",
                        background: selected?.id === r.id ? "#eff6ff" : "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 700,
                        }}
                      >
                            <span>
                              {r.studentName}
                              {r.studentId && r.studentId !== r.studentName
                                ? ` (${r.studentId})`
                                : ""}
                            </span>
                        <span style={{ color: "#2563eb" }}>
                          {r.score}/{r.total}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {r.testTitle} · {formatDate(r.submittedAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selected && (
              <div style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 16 }}>상세 성적</h2>
                  <button
                    type="button"
                    onClick={() => handleDelete(selected.id)}
                    style={{ ...btnSecondary, color: "#b91c1c", fontSize: 13 }}
                  >
                    삭제
                  </button>
                </div>
                <p style={{ margin: "0 0 4px" }}>
                  이름: <strong>{selected.studentName}</strong>
                </p>
                <p style={{ margin: "0 0 12px" }}>
                  시험: <strong>{selected.testTitle}</strong>
                </p>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>
                  {selected.score} / {selected.total}
                </div>
                <p style={{ color: "#64748b", fontSize: 14 }}>
                  {formatDate(selected.submittedAt)}
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "12px 0 0",
                    maxHeight: 400,
                    overflow: "auto",
                  }}
                >
                  {selected.details?.map((d) => (
                    <li
                      key={d.num}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        marginBottom: 4,
                        borderRadius: 6,
                        background: "#f8fafc",
                        color: d.correct ? "#047857" : "#b91c1c",
                      }}
                    >
                      <span>Q{d.num}</span>
                      <span>{d.correct ? "O" : "X"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd",
  boxSizing: "border-box",
  fontSize: 15,
};

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const btnSecondary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};
