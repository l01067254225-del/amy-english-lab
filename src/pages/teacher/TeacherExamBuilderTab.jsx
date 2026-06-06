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
import { buildVocaExamQuestions, getMixExamBreakdown, VOCA_EXAM_TYPES } from "../../utils/vocaExamBuilder";
import {
  buildMaterialCatalog,
  collectQuestionIdsFromMaterialSets,
  drawQuestionsFromPool,
} from "../../utils/materialSetStorage";
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
  const [questionBank, setQuestionBank] = useState(() => loadQuestionBank());
  const [vocaSets, setVocaSets] = useState(() => loadVocaSets());
  const [examSets, setExamSets] = useState(() => loadExamSets());
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [examTitle, setExamTitle] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [testDate, setTestDate] = useState(() => getTodayDateString());
  const [filterSubject, setFilterSubject] = useState("");
  const [vocaExamType, setVocaExamType] = useState("meaning");
  const [vocaDrawCount, setVocaDrawCount] = useState("");
  const [materialDrawCount, setMaterialDrawCount] = useState("");
  const [buildError, setBuildError] = useState("");

  useEffect(() => {
    setQuestionBank(loadQuestionBank());
    setVocaSets(loadVocaSets());
  }, []);

  const isVocabMode = filterSubject === "vocab";
  const isMaterialMode = Boolean(filterSubject);

  const levelQuestions = useMemo(
    () => filterQuestionsByLevel(questionBank, targetLevel),
    [questionBank, targetLevel]
  );

  const levelVocaSets = useMemo(
    () => filterVocaSetsByLevel(vocaSets, targetLevel),
    [vocaSets, targetLevel]
  );

  const materialCatalog = useMemo(
    () =>
      buildMaterialCatalog({
        questions: levelQuestions,
        vocaSets: levelVocaSets,
        subject: filterSubject,
        level: targetLevel,
      }),
    [levelQuestions, levelVocaSets, filterSubject, targetLevel]
  );

  const selectedMaterialQuestionIds = useMemo(
    () => collectQuestionIdsFromMaterialSets(materialCatalog, selectedMaterialIds),
    [materialCatalog, selectedMaterialIds]
  );

  const selectedQuestionPool = useMemo(
    () =>
      questionBank.filter(
        (q) =>
          selectedMaterialQuestionIds.includes(q.id) &&
          q.level === targetLevel &&
          q.subject === filterSubject
      ),
    [questionBank, selectedMaterialQuestionIds, targetLevel, filterSubject]
  );

  const selectedWords = useMemo(
    () => collectWordsFromVocaSets(levelVocaSets, selectedMaterialIds),
    [levelVocaSets, selectedMaterialIds]
  );

  const availableWordCount = selectedWords.length;
  const availableQuestionCount = isVocabMode ? availableWordCount : selectedQuestionPool.length;

  useEffect(() => {
    setSelectedMaterialIds((prev) =>
      prev.filter((id) => materialCatalog.some((entry) => entry.id === id))
    );
  }, [materialCatalog]);

  useEffect(() => {
    if (!isMaterialMode || availableQuestionCount === 0) return;
    setMaterialDrawCount((prev) => {
      const current = Number(prev);
      if (!prev || !Number.isFinite(current) || current > availableQuestionCount) {
        return String(availableQuestionCount);
      }
      return prev;
    });
  }, [isMaterialMode, availableQuestionCount, selectedMaterialIds, isVocabMode]);

  useEffect(() => {
    if (!isVocabMode || availableWordCount === 0) return;
    setVocaDrawCount((prev) => {
      const current = Number(prev);
      if (!prev || !Number.isFinite(current) || current > availableWordCount) {
        return String(availableWordCount);
      }
      return prev;
    });
  }, [isVocabMode, availableWordCount, selectedMaterialIds]);

  const toggleMaterial = (materialId) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId)
        ? prev.filter((item) => item !== materialId)
        : [...prev, materialId]
    );
  };

  const selectMaterialOnly = (materialId) => {
    setSelectedMaterialIds([materialId]);
  };

  const toggleAllMaterials = () => {
    const visibleIds = materialCatalog.map((entry) => entry.id);
    const allSelected = visibleIds.every((id) => selectedMaterialIds.includes(id));
    if (allSelected) {
      setSelectedMaterialIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedMaterialIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleTargetLevelChange = (nextLevel) => {
    setTargetLevel(nextLevel);
    setSelectedMaterialIds([]);
    setVocaDrawCount("");
    setMaterialDrawCount("");
    setBuildError("");
  };

  const handleFilterSubjectChange = (nextSubject) => {
    setFilterSubject(nextSubject);
    setBuildError("");
    setSelectedMaterialIds([]);
    setVocaDrawCount("");
    setMaterialDrawCount("");
  };

  const applyDrawPreset = (count, setter, maxCount) => {
    if (!maxCount) return;
    const next = count === "all" ? maxCount : Math.min(count, maxCount);
    setter(String(next));
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
    if (!filterSubject) {
      setBuildError("과목을 선택해 주세요.");
      return;
    }
    if (!testDate) {
      setBuildError("시험 날짜를 선택해 주세요.");
      return;
    }
    if (selectedMaterialIds.length === 0) {
      setBuildError("시험 자료를 하나 이상 선택해 주세요.");
      return;
    }

    if (isVocabMode) {
      const words = collectWordsFromVocaSets(levelVocaSets, selectedMaterialIds);
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
          setIds: selectedMaterialIds,
          examType: vocaExamType,
          drawCount,
        },
      });
      setExamSets(next);
      setExamTitle("");
      setSelectedMaterialIds([]);
      setVocaDrawCount("");
      setBuildError("");
      return;
    }

    if (selectedQuestionPool.length === 0) {
      setBuildError("선택한 자료에 포함된 문제가 없습니다.");
      return;
    }

    const drawCount = Number(materialDrawCount);
    if (!Number.isFinite(drawCount) || drawCount <= 0) {
      setBuildError("출제 문항 수를 1 이상 입력해 주세요.");
      return;
    }
    if (drawCount > selectedQuestionPool.length) {
      setBuildError(
        `출제 문항 수는 선택한 자료의 문항 수(${selectedQuestionPool.length}개)를 넘을 수 없습니다.`
      );
      return;
    }

    const selectedQuestions = drawQuestionsFromPool(selectedQuestionPool, drawCount);

    const next = addExamSet({
      title: examTitle.trim(),
      questions: selectedQuestions,
      targetLevel,
      testDate,
      materialSource: {
        materialSetIds: selectedMaterialIds,
        subject: filterSubject,
        drawCount,
      },
    });
    setExamSets(next);
    setExamTitle("");
    setSelectedMaterialIds([]);
    setMaterialDrawCount("");
    setBuildError("");
  };

  const selectedMaterialEntries = materialCatalog.filter((entry) =>
    selectedMaterialIds.includes(entry.id)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={summaryCard}>
        <h2 style={sectionTitle}>시험지 만들기</h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", lineHeight: 1.6 }}>
          대상 레벨과 과목을 선택한 뒤, 문제은행에 등록된 <strong>시험 자료명(세트)</strong>을
          고르고 출제 문항 수를 지정하면 무작위로 시험지가 생성됩니다. 학생은 본인 레벨과 시험
          날짜가 일치할 때만 시험을 볼 수 있습니다.
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
              placeholder={
                isVocabMode
                  ? "예: 6월 Voca 뜻쓰기 40제"
                  : filterSubject
                    ? `예: 6월 ${getSubjectLabel(filterSubject)} 모의고사`
                    : "예: 6월 Grammar 모의고사"
              }
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
            과목
            <select
              value={filterSubject}
              onChange={(e) => handleFilterSubjectChange(e.target.value)}
              style={inputStyle}
              disabled={!targetLevel}
            >
              <option value="">과목 선택</option>
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
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

        {buildError && (
          <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{buildError}</p>
        )}

        {!targetLevel ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            먼저 대상 레벨을 선택하면 해당 레벨의 시험 자료만 표시됩니다.
          </p>
        ) : !filterSubject ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            과목을 선택하면 등록된 시험 자료명(세트) 목록이 표시됩니다.
          </p>
        ) : materialCatalog.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            {targetLevel} 레벨 {getSubjectLabel(filterSubject)} 시험 자료가 없습니다. 문제은행
            관리에서 시험 자료명을 입력하고 텍스트 붙여넣기로 자료를 등록해 주세요.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                onClick={toggleAllMaterials}
                style={btnSecondary}
                disabled={materialCatalog.length === 0}
              >
                {materialCatalog.every((entry) => selectedMaterialIds.includes(entry.id)) &&
                materialCatalog.length > 0
                  ? "자료 선택 해제"
                  : "자료 전체 선택"}
              </button>
              <span style={{ alignSelf: "center", color: "#64748b", fontSize: 14 }}>
                선택 자료 {selectedMaterialIds.length}개
                {isVocabMode
                  ? ` · 사용 가능 단어 ${availableWordCount}개`
                  : ` · 포함 문항 ${selectedQuestionPool.length}개`}
              </span>
            </div>

            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thTdStyle, width: 48 }}></th>
                    <th style={thTdStyle}>시험 자료명</th>
                    <th style={thTdStyle}>레벨</th>
                    <th style={thTdStyle}>{isVocabMode ? "단어 수" : "문항 수"}</th>
                    <th style={thTdStyle}>미리보기</th>
                    <th style={{ ...thTdStyle, width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materialCatalog.map((entry) => {
                    const isSelected = selectedMaterialIds.includes(entry.id);
                    return (
                      <tr
                        key={`${entry.kind}-${entry.id}`}
                        style={isSelected ? { background: "#f0fdf4" } : undefined}
                      >
                        <td style={thTdStyle}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMaterial(entry.id)}
                            aria-label={`${entry.name} 선택`}
                          />
                        </td>
                        <td style={{ ...thTdStyle, fontWeight: isSelected ? 700 : 500 }}>
                          {entry.name}
                        </td>
                        <td style={thTdStyle}>{entry.level || "—"}</td>
                        <td style={thTdStyle}>{entry.count}개</td>
                        <td style={thTdStyle}>{entry.preview || "—"}</td>
                        <td style={thTdStyle}>
                          <button
                            type="button"
                            style={btnSelectSetStyle}
                            onClick={() => selectMaterialOnly(entry.id)}
                          >
                            세트 선택
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedMaterialEntries.length > 0 && (
              <div style={selectedSummaryStyle}>
                <strong style={{ color: "#0f172a" }}>선택된 시험 자료</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, color: "#475569", lineHeight: 1.7 }}>
                  {selectedMaterialEntries.map((entry) => (
                    <li key={entry.id}>
                      {entry.name} ({entry.count}
                      {isVocabMode ? "단어" : "문항"})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {isVocabMode && selectedMaterialIds.length > 0 && availableWordCount > 0 && (
          <div style={drawOptionsPanelStyle}>
            <h3 style={drawOptionsTitleStyle}>단어 시험 설정</h3>

            <div style={drawOptionBlockStyle}>
              <span style={drawOptionLabelStyle}>시험 유형</span>
              <div style={drawRadioRowStyle}>
                {VOCA_EXAM_TYPES.map((item) => (
                  <label key={item.id} style={drawRadioLabelStyle}>
                    <input
                      type="radio"
                      name="vocaExamType"
                      value={item.id}
                      checked={vocaExamType === item.id}
                      onChange={() => setVocaExamType(item.id)}
                    />
                    <span>{item.label}</span>
                    <small style={drawRadioDescStyle}>{item.description}</small>
                  </label>
                ))}
              </div>
            </div>

            <div style={drawOptionBlockStyle}>
              <label style={drawOptionLabelStyle}>
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
              <div style={drawPresetRowStyle}>
                <button
                  type="button"
                  style={btnSecondary}
                  onClick={() => applyDrawPreset("all", setVocaDrawCount, availableWordCount)}
                >
                  전체 ({availableWordCount})
                </button>
                {[40, 60, 80].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    style={btnSecondary}
                    disabled={availableWordCount < preset}
                    onClick={() => applyDrawPreset(preset, setVocaDrawCount, availableWordCount)}
                  >
                    {preset}개
                  </button>
                ))}
              </div>
              <p style={drawOptionHintStyle}>
                {vocaExamType === "mix" ? (
                  <>
                    혼합 모드: 총 {vocaDrawCount || "—"}문항 중 뜻 쓰기{" "}
                    {getMixExamBreakdown(vocaDrawCount).meaningCount}개 + 철자 쓰기{" "}
                    {getMixExamBreakdown(vocaDrawCount).spellingCount}개를 무작위로 섞어 출제합니다.
                  </>
                ) : (
                  <>선택한 세트에서 무작위로 {vocaDrawCount || "—"}개를 추출해 시험지를 만듭니다.</>
                )}
              </p>
            </div>
          </div>
        )}

        {!isVocabMode &&
          isMaterialMode &&
          selectedMaterialIds.length > 0 &&
          selectedQuestionPool.length > 0 && (
            <div style={drawOptionsPanelStyle}>
              <h3 style={drawOptionsTitleStyle}>{getSubjectLabel(filterSubject)} 출제 설정</h3>

              <div style={drawOptionBlockStyle}>
                <label style={drawOptionLabelStyle}>
                  출제 문항 수
                  <input
                    type="number"
                    min={1}
                    max={selectedQuestionPool.length}
                    value={materialDrawCount}
                    onChange={(e) => setMaterialDrawCount(e.target.value)}
                    style={{ ...inputStyle, maxWidth: 160, marginTop: 8 }}
                  />
                </label>
                <div style={drawPresetRowStyle}>
                  <button
                    type="button"
                    style={btnSecondary}
                    onClick={() =>
                      applyDrawPreset("all", setMaterialDrawCount, selectedQuestionPool.length)
                    }
                  >
                    전체 ({selectedQuestionPool.length})
                  </button>
                  {[10, 20, 30].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      style={btnSecondary}
                      disabled={selectedQuestionPool.length < preset}
                      onClick={() =>
                        applyDrawPreset(preset, setMaterialDrawCount, selectedQuestionPool.length)
                      }
                    >
                      {preset}개
                    </button>
                  ))}
                </div>
                <p style={drawOptionHintStyle}>
                  선택한 시험 자료 {selectedMaterialIds.length}개(총{" "}
                  {selectedQuestionPool.length}문항)에서 무작위로 {materialDrawCount || "—"}문항을
                  추출해 시험지를 만듭니다.
                  {filterSubject === "writing" ? " Writing 문항은 출제 순서도 무작위로 섞입니다." : ""}
                </p>
              </div>
            </div>
          )}

        <button
          type="button"
          onClick={handleBuildExam}
          style={{ ...btnPrimary, marginTop: 16 }}
          disabled={!targetLevel || !filterSubject}
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
                    {exam.materialSource?.drawCount
                      ? ` · ${exam.materialSource.drawCount}문항 추출`
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

const drawOptionsPanelStyle = {
  marginBottom: 16,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
};

const drawOptionsTitleStyle = {
  margin: "0 0 14px",
  fontSize: 16,
  fontWeight: 800,
  color: "#312e81",
};

const drawOptionBlockStyle = {
  marginBottom: 14,
};

const drawOptionLabelStyle = {
  display: "block",
  fontWeight: 700,
  color: "#334155",
  fontSize: 14,
};

const drawRadioRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const drawRadioLabelStyle = {
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

const drawRadioDescStyle = {
  fontWeight: 500,
  color: "#64748b",
  fontSize: 12,
};

const drawPresetRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const drawOptionHintStyle = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "#64748b",
};

const btnSelectSetStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const selectedSummaryStyle = {
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};
