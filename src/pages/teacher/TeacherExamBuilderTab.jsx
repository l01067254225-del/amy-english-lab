import { useMemo, useState } from "react";
import {
  addExamSet,
  getSubjectLabel,
  loadExamSets,
  loadQuestionBank,
  SUBJECT_OPTIONS,
} from "../../utils/questionBankStorage";
import {
  btnPrimary,
  btnSecondary,
  inputStyle,
  labelStyle,
  sectionTitle,
  summaryCard,
  tableStyle,
  thTdStyle,
} from "./teacherStyles";

function formatCreatedAt(isoString) {
  return new Date(isoString).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TeacherExamBuilderTab() {
  const [questionBank] = useState(() => loadQuestionBank());
  const [examSets, setExamSets] = useState(() => loadExamSets());
  const [selectedIds, setSelectedIds] = useState([]);
  const [examTitle, setExamTitle] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [buildError, setBuildError] = useState("");

  const filteredQuestions = useMemo(() => {
    if (filterSubject === "all") return questionBank;
    return questionBank.filter((q) => q.subject === filterSubject);
  }, [questionBank, filterSubject]);

  const toggleQuestion = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredQuestions.map((q) => q.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleBuildExam = () => {
    if (!examTitle.trim()) {
      setBuildError("시험지 제목을 입력해 주세요.");
      return;
    }
    if (selectedIds.length === 0) {
      setBuildError("시험에 포함할 문제를 하나 이상 선택해 주세요.");
      return;
    }

    const selectedQuestions = questionBank.filter((q) => selectedIds.includes(q.id));
    const next = addExamSet({ title: examTitle.trim(), questions: selectedQuestions });
    setExamSets(next);
    setExamTitle("");
    setSelectedIds([]);
    setBuildError("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={summaryCard}>
        <h2 style={sectionTitle}>시험지 만들기</h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", lineHeight: 1.6 }}>
          문제은행에서 시험에 넣을 문항을 선택한 뒤 시험지를 생성하세요.
        </p>

        <label style={labelStyle}>
          시험지 제목
          <input
            type="text"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            placeholder="예: 6월 Voca 모의고사"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{ ...inputStyle, width: "auto", marginTop: 0 }}
          >
            <option value="all">전체 과목</option>
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={toggleAllVisible} style={btnSecondary}>
            {filteredQuestions.every((q) => selectedIds.includes(q.id)) && filteredQuestions.length > 0
              ? "현재 목록 선택 해제"
              : "현재 목록 전체 선택"}
          </button>
          <span style={{ alignSelf: "center", color: "#64748b", fontSize: 14 }}>
            선택됨: {selectedIds.length}문항
          </span>
        </div>

        {buildError && (
          <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{buildError}</p>
        )}

        {questionBank.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            문제은행에 등록된 문항이 없습니다. 먼저 문제은행 관리 탭에서 문제를 추가하세요.
          </p>
        ) : filteredQuestions.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>선택한 과목에 해당하는 문제가 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thTdStyle, width: 48 }}></th>
                  <th style={thTdStyle}>과목</th>
                  <th style={thTdStyle}>문제</th>
                  <th style={thTdStyle}>정답</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q) => (
                  <tr key={q.id}>
                    <td style={thTdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                      />
                    </td>
                    <td style={thTdStyle}>{getSubjectLabel(q.subject)}</td>
                    <td style={thTdStyle}>{q.prompt}</td>
                    <td style={thTdStyle}>{q.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={handleBuildExam}
          style={btnPrimary}
          disabled={questionBank.length === 0}
        >
          시험지 만들기
        </button>
      </div>

      <div style={summaryCard}>
        <h2 style={sectionTitle}>생성된 시험 세트 ({examSets.length}건)</h2>
        {examSets.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>아직 생성된 시험지가 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {examSets.map((exam) => (
              <div
                key={exam.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ color: "#0f172a", fontSize: 16 }}>{exam.title}</strong>
                  <span style={{ color: "#64748b", fontSize: 13 }}>
                    {exam.questions.length}문항 · {formatCreatedAt(exam.createdAt)}
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", lineHeight: 1.7 }}>
                  {exam.questions.map((q) => (
                    <li key={q.id}>
                      [{getSubjectLabel(q.subject)}] {q.prompt} → {q.answer}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
