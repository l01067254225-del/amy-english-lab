import { useMemo, useState } from "react";
import {
  addExamSet,
  filterQuestionsByLevel,
  formatQuestionAnswer,
  getSubjectLabel,
  loadExamSets,
  loadQuestionBank,
  SUBJECT_OPTIONS,
} from "../../utils/questionBankStorage";
import { formatTestDate, getTodayDateString, LEVEL_OPTIONS } from "../../utils/levels";
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
  const [targetLevel, setTargetLevel] = useState("");
  const [testDate, setTestDate] = useState(() => getTodayDateString());
  const [filterSubject, setFilterSubject] = useState("all");
  const [buildError, setBuildError] = useState("");

  const levelQuestions = useMemo(
    () => filterQuestionsByLevel(questionBank, targetLevel),
    [questionBank, targetLevel]
  );

  const filteredQuestions = useMemo(() => {
    if (filterSubject === "all") return levelQuestions;
    return levelQuestions.filter((q) => q.subject === filterSubject);
  }, [levelQuestions, filterSubject]);

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

  const handleTargetLevelChange = (nextLevel) => {
    setTargetLevel(nextLevel);
    setSelectedIds((prev) =>
      prev.filter((id) => {
        const question = questionBank.find((q) => q.id === id);
        return question?.level === nextLevel;
      })
    );
  };

  const handleBuildExam = () => {
    if (!examTitle.trim()) {
      setBuildError("시험지 제목을 입력해 주세요.");
      return;
    }
    if (!targetLevel) {
      setBuildError("대상 레벨을 선택해 주세요.");
      return;
    }
    if (!testDate) {
      setBuildError("시험 날짜를 선택해 주세요.");
      return;
    }
    if (selectedIds.length === 0) {
      setBuildError("시험에 포함할 문제를 하나 이상 선택해 주세요.");
      return;
    }

    const selectedQuestions = questionBank.filter(
      (q) => selectedIds.includes(q.id) && q.level === targetLevel
    );
    if (selectedQuestions.length === 0) {
      setBuildError("선택한 레벨에 해당하는 문제가 없습니다.");
      return;
    }

    const next = addExamSet({
      title: examTitle.trim(),
      questions: selectedQuestions,
      targetLevel,
      testDate,
    });
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
          대상 레벨과 시험 날짜를 지정한 뒤, 해당 레벨 문제은행에서 문항을 선택해 시험지를
          생성하세요. 학생은 본인 레벨과 시험 날짜가 일치할 때만 시험을 볼 수 있습니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
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

          <label style={labelStyle}>
            대상 레벨
            <select
              value={targetLevel}
              onChange={(e) => handleTargetLevelChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">레벨 선택</option>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            시험 날짜
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{ ...inputStyle, width: "auto", marginTop: 0 }}
            disabled={!targetLevel}
          >
            <option value="all">전체 과목</option>
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleAllVisible}
            style={btnSecondary}
            disabled={!targetLevel || filteredQuestions.length === 0}
          >
            {filteredQuestions.every((q) => selectedIds.includes(q.id)) &&
            filteredQuestions.length > 0
              ? "현재 목록 선택 해제"
              : "현재 목록 전체 선택"}
          </button>
          <span style={{ alignSelf: "center", color: "#64748b", fontSize: 14 }}>
            선택됨: {selectedIds.length}문항
            {targetLevel ? ` · ${targetLevel} 레벨` : ""}
          </span>
        </div>

        {buildError && (
          <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{buildError}</p>
        )}

        {!targetLevel ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            먼저 대상 레벨을 선택하면 해당 레벨 문제만 표시됩니다.
          </p>
        ) : questionBank.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            문제은행에 등록된 문항이 없습니다. 먼저 문제은행 관리 탭에서 문제를 추가하세요.
          </p>
        ) : levelQuestions.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            {targetLevel} 레벨로 등록된 문제가 없습니다. 문제은행에서 레벨을 지정해 문항을
            추가해 주세요.
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
                  <th style={thTdStyle}>레벨</th>
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
                    <td style={thTdStyle}>{q.level || "—"}</td>
                    <td style={thTdStyle}>{q.prompt}</td>
                    <td style={thTdStyle}>{formatQuestionAnswer(q)}</td>
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
          disabled={!targetLevel || questionBank.length === 0}
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
                    {exam.questions.length}문항 · {exam.targetLevel || "레벨 미지정"} ·{" "}
                    {exam.testDate ? formatTestDate(exam.testDate) : "날짜 미지정"} ·{" "}
                    {formatCreatedAt(exam.createdAt)}
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", lineHeight: 1.7 }}>
                  {exam.questions.map((q) => (
                    <li key={q.id}>
                      [{getSubjectLabel(q.subject)}] {q.prompt} → {formatQuestionAnswer(q)}
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
