import { useMemo, useRef, useState } from "react";
import {
  SUBJECT_OPTIONS,
  addQuestion,
  addQuestionsBulk,
  formatQuestionAnswer,
  getSubjectLabel,
  getSubjectMeta,
  loadQuestionBank,
  removeQuestion,
} from "../../utils/questionBankStorage";
import { parseQuestionCsv } from "../../utils/parseQuestionCsv";

const EMPTY_OPTIONS = ["", "", "", ""];

export default function TeacherQuestionBankTab() {
  const fileInputRef = useRef(null);
  const [questions, setQuestions] = useState(() => loadQuestionBank());
  const [questionType, setQuestionType] = useState("subjective");
  const [subject, setSubject] = useState("vocab");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions.filter((q) => {
      if (filterSubject !== "all" && q.subject !== filterSubject) return false;
      if (!query) return true;
      const haystack = [
        q.prompt,
        q.answer,
        getSubjectLabel(q.subject),
        ...(q.options ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [questions, searchQuery, filterSubject]);

  const resetForm = () => {
    setPrompt("");
    setAnswer("");
    setOptions(EMPTY_OPTIONS);
    setFormError("");
  };

  const handleAdd = (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setFormError("문제 내용을 입력해 주세요.");
      return;
    }

    if (questionType === "objective") {
      if (options.some((opt) => !opt.trim())) {
        setFormError("객관식 보기 1~4번을 모두 입력해 주세요.");
        return;
      }
      const answerNum = Number(answer);
      if (!Number.isInteger(answerNum) || answerNum < 1 || answerNum > 4) {
        setFormError("정답은 1~4 사이의 보기 번호로 입력해 주세요.");
        return;
      }
    } else if (!answer.trim()) {
      setFormError("정답을 입력해 주세요.");
      return;
    }

    const next = addQuestion({
      subject,
      prompt,
      answer,
      type: questionType,
      options: questionType === "objective" ? options : [],
    });
    setQuestions(next);
    resetForm();
  };

  const handleDelete = (id) => {
    if (!confirm("이 문제를 삭제할까요?")) return;
    setQuestions(removeQuestion(id));
  };

  const processCsvFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("CSV 파일만 업로드할 수 있습니다.");
      return;
    }

    setCsvUploading(true);
    try {
      const text = await file.text();
      const { items, errors } = parseQuestionCsv(text);

      if (items.length === 0) {
        const detail = errors.length ? `\n\n${errors.slice(0, 3).join("\n")}` : "";
        alert(`등록할 문항을 찾지 못했습니다.${detail}`);
        return;
      }

      const next = addQuestionsBulk(items);
      setQuestions(next);
      alert(`성공적으로 ${items.length}개의 문항이 등록되었습니다.`);
    } catch {
      alert("CSV 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e) => {
    processCsvFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processCsvFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div style={pageWrapStyle}>
      <style>{`
        @keyframes qbSlideDown {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 320px; }
        }
        @keyframes qbFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .qb-options-panel {
          animation: qbSlideDown 0.35s ease forwards;
          overflow: hidden;
        }
        .qb-option-row {
          animation: qbFadeIn 0.3s ease forwards;
        }
        .qb-dropzone:hover {
          border-color: #6366f1 !important;
          background: #f8faff !important;
        }
      `}</style>

      <div style={topGridStyle}>
        {/* ── 문제 추가 폼 ── */}
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>문제 추가</h2>
              <p style={panelDescStyle}>주관식·객관식 문항을 바로 등록하세요</p>
            </div>
            <TypeToggle value={questionType} onChange={setQuestionType} />
          </div>

          <form onSubmit={handleAdd}>
            <div style={fieldGridStyle}>
              <label style={fieldLabelStyle}>
                과목
                <select value={subject} onChange={(e) => setSubject(e.target.value)} style={selectStyle}>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
                문제 (단어 / 문장)
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="예: What is the capital of Korea?"
                  style={inputStyle}
                />
              </label>

              {questionType === "objective" && (
                <div className="qb-options-panel" style={{ gridColumn: "1 / -1" }}>
                  <p style={optionsLabelStyle}>보기 입력 (1~4번)</p>
                  <div style={optionsGridStyle}>
                    {options.map((opt, index) => (
                      <label
                        key={index}
                        className="qb-option-row"
                        style={optionRowLabelStyle}
                      >
                        <span style={optionNumStyle}>{index + 1}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...options];
                            next[index] = e.target.value;
                            setOptions(next);
                          }}
                          placeholder={`보기 ${index + 1}`}
                          style={{ ...inputStyle, marginTop: 0, flex: 1 }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
                정답
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    questionType === "objective"
                      ? "보기 번호 입력 (1 ~ 4)"
                      : "예: Seoul / I go to school."
                  }
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  {questionType === "objective"
                    ? "객관식은 정답 보기 번호(1, 2, 3, 4)를 입력하세요."
                    : "주관식은 정답 텍스트를 그대로 입력하세요."}
                </span>
              </label>
            </div>

            {formError && <p style={errorStyle}>{formError}</p>}

            <button type="submit" style={primaryBtnStyle}>
              + 문제 등록
            </button>
          </form>
        </section>

        {/* ── CSV 일괄 등록 ── */}
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>CSV 일괄 등록</h2>
              <p style={panelDescStyle}>엑셀(CSV) 파일로 단어장을 한 번에 등록</p>
            </div>
          </div>

          <div
            className="qb-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              ...dropzoneStyle,
              borderColor: isDragOver ? "#6366f1" : "#cbd5e1",
              background: isDragOver ? "#eef2ff" : "#fafbfc",
            }}
          >
            <div style={dropIconStyle}>📄</div>
            <p style={dropTitleStyle}>엑셀(CSV) 파일로 단어장 일괄 등록하기</p>
            <p style={dropDescStyle}>
              파일을 여기에 끌어다 놓거나 클릭하여 선택하세요
            </p>
            <code style={csvFormatStyle}>단어,정답,과목</code>
            <p style={dropExampleStyle}>
              예: apple,사과,Voca &nbsp;·&nbsp; run,달리다,Writing
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              style={secondaryBtnStyle}
              disabled={csvUploading}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {csvUploading ? "등록 중..." : "CSV 파일 선택"}
            </button>
          </div>
        </section>
      </div>

      {/* ── 문제 목록 ── */}
      <section style={panelStyle}>
        <div style={listHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>문제은행 목록</h2>
            <p style={panelDescStyle}>
              총 {questions.length}건 · 표시 {filteredQuestions.length}건
            </p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문제, 정답, 보기 검색..."
            style={searchStyle}
          />
        </div>

        <div style={filterRowStyle}>
          <FilterChip
            active={filterSubject === "all"}
            label="전체"
            onClick={() => setFilterSubject("all")}
          />
          {SUBJECT_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.id}
              active={filterSubject === opt.id}
              label={opt.label}
              color={opt.color}
              bg={opt.bg}
              onClick={() => setFilterSubject(opt.id)}
            />
          ))}
        </div>

        {filteredQuestions.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>
              {questions.length === 0 ? "등록된 문제가 없습니다." : "검색 결과가 없습니다."}
            </p>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 14 }}>
              위에서 문제를 추가하거나 CSV 파일을 업로드해 보세요.
            </p>
          </div>
        ) : (
          <div style={cardListStyle}>
            {filteredQuestions.map((q) => (
              <QuestionCard key={q.id} question={q} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TypeToggle({ value, onChange }) {
  return (
    <div style={toggleWrapStyle}>
      {[
        { id: "subjective", label: "주관식" },
        { id: "objective", label: "객관식" },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          style={{
            ...toggleBtnStyle,
            ...(value === item.id ? toggleBtnActiveStyle : {}),
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FilterChip({ active, label, onClick, color = "#475569", bg = "#f1f5f9" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...chipStyle,
        background: active ? bg : "white",
        color: active ? color : "#64748b",
        borderColor: active ? color : "#e2e8f0",
        fontWeight: active ? 800 : 600,
      }}
    >
      {label}
    </button>
  );
}

function QuestionCard({ question, onDelete }) {
  const subjectMeta = getSubjectMeta(question.subject);
  const isObjective = question.type === "objective";

  return (
    <article
      style={{
        ...cardStyle,
        borderLeft: `4px solid ${subjectMeta.color}`,
      }}
    >
      <div style={cardTopStyle}>
        <div style={badgeRowStyle}>
          <span
            style={{
              ...subjectBadgeStyle,
              color: subjectMeta.color,
              background: subjectMeta.bg,
            }}
          >
            {subjectMeta.label}
          </span>
          <span
            style={{
              ...typeBadgeStyle,
              ...(isObjective ? typeBadgeObjectiveStyle : typeBadgeSubjectiveStyle),
            }}
          >
            {isObjective ? "객관식" : "주관식"}
          </span>
        </div>
        <button type="button" onClick={() => onDelete(question.id)} style={deleteBtnStyle}>
          삭제
        </button>
      </div>

      <p style={promptStyle}>{question.prompt}</p>

      {isObjective && question.options.length > 0 && (
        <div style={optionsListStyle}>
          {question.options.map((opt, index) => {
            const isCorrect = String(question.answer) === String(index + 1);
            return (
              <div
                key={index}
                style={{
                  ...optionItemStyle,
                  ...(isCorrect ? optionItemCorrectStyle : {}),
                }}
              >
                <span style={optionBadgeStyle}>{index + 1}</span>
                <span style={{ flex: 1 }}>{opt}</span>
                {isCorrect && <span style={correctMarkStyle}>정답</span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={answerRowStyle}>
        <span style={answerLabelStyle}>정답</span>
        <span style={answerValueStyle}>{formatQuestionAnswer(question)}</span>
      </div>
    </article>
  );
}

/* ── Styles ── */

const pageWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 20,
  alignItems: "start",
};

const panelStyle = {
  background: "white",
  borderRadius: 18,
  padding: "24px 26px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  border: "1px solid #eef2f7",
};

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap",
};

const panelTitleStyle = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const panelDescStyle = {
  margin: "6px 0 0",
  fontSize: 14,
  color: "#94a3b8",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const fieldLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  fontSize: 15,
  color: "#0f172a",
  background: "#fafbfc",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const optionsLabelStyle = {
  margin: "0 0 10px",
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
};

const optionsGridStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const optionRowLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const optionNumStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "#eef2ff",
  color: "#4f46e5",
  fontWeight: 800,
  fontSize: 13,
  flexShrink: 0,
};

const hintStyle = {
  marginTop: 6,
  fontSize: 12,
  fontWeight: 500,
  color: "#94a3b8",
};

const errorStyle = {
  color: "#dc2626",
  margin: "12px 0 0",
  fontSize: 14,
  fontWeight: 600,
};

const primaryBtnStyle = {
  marginTop: 18,
  width: "100%",
  padding: "13px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 15,
  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
};

const secondaryBtnStyle = {
  marginTop: 14,
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid #c7d2fe",
  background: "white",
  color: "#4338ca",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const dropzoneStyle = {
  border: "2px dashed #cbd5e1",
  borderRadius: 16,
  padding: "32px 24px",
  textAlign: "center",
  cursor: "pointer",
  transition: "border-color 0.2s, background 0.2s",
};

const dropIconStyle = { fontSize: 36, marginBottom: 8 };

const dropTitleStyle = {
  margin: "0 0 6px",
  fontSize: 16,
  fontWeight: 800,
  color: "#1e293b",
};

const dropDescStyle = {
  margin: "0 0 14px",
  fontSize: 14,
  color: "#94a3b8",
};

const csvFormatStyle = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: 8,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
};

const dropExampleStyle = {
  margin: "10px 0 0",
  fontSize: 12,
  color: "#94a3b8",
};

const listHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 16,
  flexWrap: "wrap",
};

const searchStyle = {
  width: "min(280px, 100%)",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  background: "#fafbfc",
  boxSizing: "border-box",
};

const filterRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 20,
};

const chipStyle = {
  padding: "7px 14px",
  borderRadius: 999,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  fontSize: 13,
  transition: "all 0.15s ease",
};

const emptyStateStyle = {
  textAlign: "center",
  padding: "48px 20px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px dashed #e2e8f0",
};

const cardListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const cardStyle = {
  borderRadius: 14,
  padding: "18px 20px",
  background: "#fafbfc",
  border: "1px solid #eef2f7",
};

const cardTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

const badgeRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const subjectBadgeStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const typeBadgeStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const typeBadgeSubjectiveStyle = {
  background: "#dbeafe",
  color: "#1d4ed8",
};

const typeBadgeObjectiveStyle = {
  background: "#ede9fe",
  color: "#6d28d9",
};

const deleteBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "white",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  flexShrink: 0,
};

const promptStyle = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
  lineHeight: 1.5,
};

const optionsListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
  marginBottom: 12,
};

const optionItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "white",
  border: "1px solid #e2e8f0",
  fontSize: 13,
  color: "#475569",
};

const optionItemCorrectStyle = {
  borderColor: "#a7f3d0",
  background: "#ecfdf5",
};

const optionBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 6,
  background: "#f1f5f9",
  color: "#64748b",
  fontWeight: 800,
  fontSize: 11,
  flexShrink: 0,
};

const correctMarkStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#059669",
  background: "#d1fae5",
  padding: "2px 8px",
  borderRadius: 999,
};

const answerRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingTop: 10,
  borderTop: "1px solid #e2e8f0",
};

const answerLabelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const answerValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#2563eb",
};

const toggleWrapStyle = {
  display: "inline-flex",
  padding: 4,
  borderRadius: 12,
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  gap: 4,
};

const toggleBtnStyle = {
  padding: "8px 16px",
  borderRadius: 9,
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  transition: "all 0.2s ease",
};

const toggleBtnActiveStyle = {
  background: "white",
  color: "#0f172a",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
};
