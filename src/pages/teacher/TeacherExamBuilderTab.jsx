import { useEffect, useMemo, useState } from "react";
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
import { buildVocaExamQuestions, VOCA_EXAM_TYPES } from "../../utils/vocaExamBuilder";
import {
  collectWordsFromVocaSets,
  filterVocaSetsByLevel,
  loadVocaSets,
} from "../../utils/vocaSetStorage";
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

function getVocaExamTypeLabel(examType) {
  return VOCA_EXAM_TYPES.find((item) => item.id === examType)?.label ?? examType;
}

export default function TeacherExamBuilderTab() {
  const [questionBank] = useState(() => loadQuestionBank());
  const [vocaSets] = useState(() => loadVocaSets());
  const [examSets, setExamSets] = useState(() => loadExamSets());
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedSetIds, setSelectedSetIds] = useState([]);
  const [examTitle, setExamTitle] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [testDate, setTestDate] = useState(() => getTodayDateString());
  const [filterSubject, setFilterSubject] = useState("all");
  const [vocaExamType, setVocaExamType] = useState("meaning");
  const [vocaDrawCount, setVocaDrawCount] = useState("");
  const [buildError, setBuildError] = useState("");

  const isVocabMode = filterSubject === "vocab";

  const levelQuestions = useMemo(
    () => filterQuestionsByLevel(questionBank, targetLevel),
    [questionBank, targetLevel]
  );

  const levelVocaSets = useMemo(
    () => filterVocaSetsByLevel(vocaSets, targetLevel),
    [vocaSets, targetLevel]
  );

  const filteredQuestions = useMemo(() => {
    if (filterSubject === "all") return levelQuestions;
    if (isVocabMode) return [];
    return levelQuestions.filter((q) => q.subject === filterSubject);
  }, [levelQuestions, filterSubject, isVocabMode]);

  const selectedWords = useMemo(
    () => collectWordsFromVocaSets(levelVocaSets, selectedSetIds),
    [levelVocaSets, selectedSetIds]
  );

  const availableWordCount = selectedWords.length;

  useEffect(() => {
    if (!isVocabMode || availableWordCount === 0) return;
    setVocaDrawCount((prev) => {
      const current = Number(prev);
      if (!prev || !Number.isFinite(current) || current > availableWordCount) {
        return String(availableWordCount);
      }
      return prev;
    });
  }, [isVocabMode, availableWordCount, selectedSetIds]);

  const toggleQuestion = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleVocaSet = (setId) => {
    setSelectedSetIds((prev) =>
      prev.includes(setId) ? prev.filter((item) => item !== setId) : [...prev, setId]
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

  const toggleAllVocaSets = () => {
    const visibleIds = levelVocaSets.map((set) => set.setId);
    const allSelected = visibleIds.every((id) => selectedSetIds.includes(id));
    if (allSelected) {
      setSelectedSetIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedSetIds((prev) => [...new Set([...prev, ...visibleIds])]);
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
    setSelectedSetIds((prev) =>
      prev.filter((id) => {
        const set = vocaSets.find((item) => item.setId === id);
        return set?.level === nextLevel;
      })
    );
  };

  const handleFilterSubjectChange = (nextSubject) => {
    setFilterSubject(nextSubject);
    setBuildError("");
    if (nextSubject === "vocab") {
      setSelectedIds([]);
    } else {
      setSelectedSetIds([]);
    }
  };

  const applyDrawPreset = (count) => {
    if (!availableWordCount) return;
    const next = count === "all" ? availableWordCount : Math.min(count, availableWordCount);
    setVocaDrawCount(String(next));
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

    if (isVocabMode) {
      if (selectedSetIds.length === 0) {
        setBuildError("Voca 단어 세트를 하나 이상 선택해 주세요.");
        return;
      }

      const words = collectWordsFromVocaSets(levelVocaSets, selectedSetIds);
      if (words.length === 0) {
        setBuildError("선택한 세트에 등록된 단어가 없습니다.");
        return;
      }

      const drawCount = Number(vocaDrawCount);
      if (!Number.isFinite(drawCount) || drawCount <= 0) {
        setBuildError("출제 문항 수를 1 이상 입력해 주세요.");
        return;
      }
      if (drawCount > words.length) {
        setBuildError(`출제 문항 수는 선택한 세트 단어 수(${words.length}개)를 넘을 수 없습니다.`);
        return;
      }

      const generated = buildVocaExamQuestions(words, {
        examType: vocaExamType,
        drawCount,
      }).map((question) => ({ ...question, level: targetLevel }));

      if (generated.length === 0) {
        setBuildError("시험 문항을 생성하지 못했습니다.");
        return;
      }

      const next = addExamSet({
        title: examTitle.trim(),
        questions: generated,
        targetLevel,
        testDate,
        vocaSource: {
          setIds: selectedSetIds,
          examType: vocaExamType,
          drawCount,
        },
      });
      setExamSets(next);
      setExamTitle("");
      setSelectedSetIds([]);
      setVocaDrawCount("");
      setBuildError("");
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
          {isVocabMode
            ? "Voca는 단어 세트를 선택하고 시험 유형·출제 수를 지정하면 무작위로 문항이 생성됩니다."
            : "대상 레벨과 시험 날짜를 지정한 뒤, 해당 레벨 문제은행에서 문항을 선택해 시험지를 생성하세요."}{" "}
          학생은 본인 레벨과 시험 날짜가 일치할 때만 시험을 볼 수 있습니다.
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
              placeholder={isVocabMode ? "예: 6월 Voca 뜻쓰기 40제" : "예: 6월 Grammar 모의고사"}
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
            onChange={(e) => handleFilterSubjectChange(e.target.value)}
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

          {isVocabMode ? (
            <>
              <button
                type="button"
                onClick={toggleAllVocaSets}
                style={btnSecondary}
                disabled={!targetLevel || levelVocaSets.length === 0}
              >
                {levelVocaSets.every((set) => selectedSetIds.includes(set.setId)) &&
                levelVocaSets.length > 0
                  ? "세트 선택 해제"
                  : "세트 전체 선택"}
              </button>
              <span style={{ alignSelf: "center", color: "#64748b", fontSize: 14 }}>
                선택 세트 {selectedSetIds.length}개 · 사용 가능 단어 {availableWordCount}개
              </span>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {buildError && (
          <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{buildError}</p>
        )}

        {!targetLevel ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            먼저 대상 레벨을 선택하면 해당 레벨 자료만 표시됩니다.
          </p>
        ) : isVocabMode ? (
          levelVocaSets.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              {targetLevel} 레벨 Voca 단어 세트가 없습니다. 문제은행 관리에서 텍스트 붙여넣기로
              세트를 등록해 주세요.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thTdStyle, width: 48 }}></th>
                    <th style={thTdStyle}>세트 이름</th>
                    <th style={thTdStyle}>레벨</th>
                    <th style={thTdStyle}>단어 수</th>
                    <th style={thTdStyle}>미리보기</th>
                  </tr>
                </thead>
                <tbody>
                  {levelVocaSets.map((set) => (
                    <tr key={set.setId}>
                      <td style={thTdStyle}>
                        <input
                          type="checkbox"
                          checked={selectedSetIds.includes(set.setId)}
                          onChange={() => toggleVocaSet(set.setId)}
                        />
                      </td>
                      <td style={thTdStyle}>{set.setName}</td>
                      <td style={thTdStyle}>{set.level || "—"}</td>
                      <td style={thTdStyle}>{set.words.length}개</td>
                      <td style={thTdStyle}>
                        {set.words
                          .slice(0, 3)
                          .map((entry) => `${entry.word}(${entry.mean})`)
                          .join(", ")}
                        {set.words.length > 3 ? " …" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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

        {isVocabMode && selectedSetIds.length > 0 && availableWordCount > 0 && (
          <div style={vocaOptionsPanelStyle}>
            <h3 style={vocaOptionsTitleStyle}>단어 시험 설정</h3>

            <div style={vocaOptionBlockStyle}>
              <span style={vocaOptionLabelStyle}>시험 유형</span>
              <div style={vocaRadioRowStyle}>
                {VOCA_EXAM_TYPES.map((item) => (
                  <label key={item.id} style={vocaRadioLabelStyle}>
                    <input
                      type="radio"
                      name="vocaExamType"
                      value={item.id}
                      checked={vocaExamType === item.id}
                      onChange={() => setVocaExamType(item.id)}
                    />
                    <span>{item.label}</span>
                    <small style={vocaRadioDescStyle}>{item.description}</small>
                  </label>
                ))}
              </div>
            </div>

            <div style={vocaOptionBlockStyle}>
              <label style={vocaOptionLabelStyle}>
                출제 문항 수
                <input
                  type="number"
                  min={1}
                  max={availableWordCount}
                  value={vocaDrawCount}
                  onChange={(e) => setVocaDrawCount(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 160, marginTop: 8 }}
                />
              </label>
              <div style={vocaPresetRowStyle}>
                <button type="button" style={btnSecondary} onClick={() => applyDrawPreset("all")}>
                  전체 ({availableWordCount})
                </button>
                {[40, 60, 80].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    style={btnSecondary}
                    disabled={availableWordCount < preset}
                    onClick={() => applyDrawPreset(preset)}
                  >
                    {preset}개
                  </button>
                ))}
              </div>
              <p style={vocaOptionHintStyle}>
                선택한 세트에서 무작위로 {vocaDrawCount || "—"}개를 추출해 시험지를 만듭니다.
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleBuildExam}
          style={btnPrimary}
          disabled={
            !targetLevel ||
            (isVocabMode ? levelVocaSets.length === 0 : questionBank.length === 0)
          }
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
                    {exam.vocaSource
                      ? ` · Voca ${getVocaExamTypeLabel(exam.vocaSource.examType)}`
                      : ""}
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", lineHeight: 1.7 }}>
                  {exam.questions.slice(0, 8).map((q) => (
                    <li key={q.id}>
                      [{getSubjectLabel(q.subject)}] {q.prompt} → {formatQuestionAnswer(q)}
                    </li>
                  ))}
                  {exam.questions.length > 8 ? (
                    <li style={{ color: "#64748b" }}>외 {exam.questions.length - 8}문항</li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const vocaOptionsPanelStyle = {
  marginBottom: 16,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
};

const vocaOptionsTitleStyle = {
  margin: "0 0 14px",
  fontSize: 16,
  fontWeight: 800,
  color: "#312e81",
};

const vocaOptionBlockStyle = {
  marginBottom: 14,
};

const vocaOptionLabelStyle = {
  display: "block",
  fontWeight: 700,
  color: "#334155",
  fontSize: 14,
};

const vocaRadioRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const vocaRadioLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "12px 14px",
  borderRadius: 12,
  background: "white",
  border: "1px solid #dbeafe",
  cursor: "pointer",
  fontWeight: 700,
  color: "#1e293b",
};

const vocaRadioDescStyle = {
  fontWeight: 500,
  color: "#64748b",
  fontSize: 12,
};

const vocaPresetRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const vocaOptionHintStyle = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "#64748b",
};
