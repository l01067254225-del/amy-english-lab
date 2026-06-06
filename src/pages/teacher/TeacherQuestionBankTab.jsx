import { useState } from "react";
import {
  SUBJECT_OPTIONS,
  addQuestion,
  getSubjectLabel,
  loadQuestionBank,
  removeQuestion,
} from "../../utils/questionBankStorage";
import {
  btnDanger,
  btnPrimary,
  inputStyle,
  labelStyle,
  sectionTitle,
  summaryCard,
  tableStyle,
  thTdStyle,
} from "./teacherStyles";

export default function TeacherQuestionBankTab() {
  const [questions, setQuestions] = useState(() => loadQuestionBank());
  const [subject, setSubject] = useState("vocab");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [formError, setFormError] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!prompt.trim() || !answer.trim()) {
      setFormError("문제와 정답을 모두 입력해 주세요.");
      return;
    }
    const next = addQuestion({ subject, prompt, answer });
    setQuestions(next);
    setPrompt("");
    setAnswer("");
    setFormError("");
  };

  const handleDelete = (id) => {
    if (!confirm("이 문제를 삭제할까요?")) return;
    setQuestions(removeQuestion(id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={summaryCard}>
        <h2 style={sectionTitle}>문제 추가</h2>
        <form onSubmit={handleAdd}>
          <label style={labelStyle}>
            과목
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            문제 (단어/문장)
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: apple / 나는 학교에 간다."
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            정답
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="예: 사과 / I go to school."
              style={inputStyle}
            />
          </label>

          {formError && (
            <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{formError}</p>
          )}

          <button type="submit" style={btnPrimary}>
            문제 추가
          </button>
        </form>
      </div>

      <div style={summaryCard}>
        <h2 style={sectionTitle}>문제은행 목록 ({questions.length}건)</h2>
        {questions.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>등록된 문제가 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>과목</th>
                  <th style={thTdStyle}>문제</th>
                  <th style={thTdStyle}>정답</th>
                  <th style={thTdStyle}></th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td style={thTdStyle}>{getSubjectLabel(q.subject)}</td>
                    <td style={thTdStyle}>{q.prompt}</td>
                    <td style={thTdStyle}>{q.answer}</td>
                    <td style={thTdStyle}>
                      <button type="button" onClick={() => handleDelete(q.id)} style={btnDanger}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
