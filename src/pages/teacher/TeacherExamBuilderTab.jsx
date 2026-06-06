import { useEffect, useMemo, useState } from "react";
import ExamSetEditModal from "../../components/ExamSetEditModal";
import {
  addExamSet,
  deleteExamSet,
  filterQuestionsByLevel,
  getSubjectLabel,
  loadExamSets,
  loadQuestionBank,
  SUBJECT_OPTIONS,
  updateExamSet,
} from "../../utils/questionBankStorage";
import { getExamDeploymentInfo } from "../../utils/examDeployment";
import { buildExamPayloadFromSelection } from "../../utils/examSetBuilder";
import { formatTestDate, getTodayDateString, LEVEL_OPTIONS } from "../../utils/levels";
import { getMixExamBreakdown, VOCA_EXAM_TYPES } from "../../utils/vocaExamBuilder";
import { buildSetNameList } from "../../utils/examSetStorage";
import { filterVocaSetsByLevel, loadVocaSets } from "../../utils/vocaSetStorage";
import {
  btnPrimary,
  btnSecondary,
  inputStyle,
  labelStyle,
  sectionTitle,
  summaryCard,
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
  const [selectedSetNames, setSelectedSetNames] = useState([]);
  const [selectedSetsData, setSelectedSetsData] = useState([]);
  const [examTitle, setExamTitle] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [testDate, setTestDate] = useState(() => getTodayDateString());
  const [filterSubject, setFilterSubject] = useState("");
  const [vocaExamType, setVocaExamType] = useState("meaning");
  const [drawCount, setDrawCount] = useState("");
  const [buildError, setBuildError] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setQuestionBank(loadQuestionBank());
    setVocaSets(loadVocaSets());
  }, []);

  const isVocabMode = filterSubject === "vocab";

  const levelQuestions = useMemo(
    () => filterQuestionsByLevel(questionBank, targetLevel),
    [questionBank, targetLevel]
  );

  const levelVocaSets = useMemo(
    () => filterVocaSetsByLevel(vocaSets, targetLevel),
    [vocaSets, targetLevel]
  );

  const setNameList = useMemo(
    () =>
      buildSetNameList({
        questions: levelQuestions,
        vocaSets: levelVocaSets,
        subject: filterSubject,
        level: targetLevel,
      }),
    [levelQuestions, levelVocaSets, filterSubject, targetLevel]
  );

  useEffect(() => {
    setSelectedSetNames((prev) =>
      prev.filter((name) => setNameList.some((entry) => entry.setName === name))
    );
  }, [setNameList]);

  useEffect(() => {
    const nextSelectedSets = setNameList.filter((entry) =>
      selectedSetNames.includes(entry.setName)
    );
    setSelectedSetsData(nextSelectedSets);
  }, [setNameList, selectedSetNames]);

  const poolSize = useMemo(() => {
    if (isVocabMode) {
      return selectedSetsData.reduce((sum, entry) => sum + entry.count, 0);
    }
    return selectedSetsData.reduce((sum, entry) => sum + entry.questions.length, 0);
  }, [selectedSetsData, isVocabMode]);

  useEffect(() => {
    if (!filterSubject || poolSize === 0) return;
    setDrawCount((prev) => {
      const current = Number(prev);
      if (!prev || !Number.isFinite(current) || current > poolSize) {
        return String(poolSize);
      }
      return prev;
    });
  }, [filterSubject, poolSize, selectedSetNames, isVocabMode]);

  const toggleSetName = (setName) => {
    setSelectedSetNames((prev) =>
      prev.includes(setName) ? prev.filter((name) => name !== setName) : [...prev, setName]
    );
  };

  const toggleAllSetNames = () => {
    const visibleNames = setNameList.map((entry) => entry.setName);
    const allSelected = visibleNames.every((name) => selectedSetNames.includes(name));
    if (allSelected) {
      setSelectedSetNames((prev) => prev.filter((name) => !visibleNames.includes(name)));
    } else {
      setSelectedSetNames((prev) => [...new Set([...prev, ...visibleNames])]);
    }
  };

  const handleTargetLevelChange = (nextLevel) => {
    setTargetLevel(nextLevel);
    setSelectedSetNames([]);
    setSelectedSetsData([]);
    setDrawCount("");
    setBuildError("");
  };

  const handleFilterSubjectChange = (nextSubject) => {
    setFilterSubject(nextSubject);
    setBuildError("");
    setSelectedSetNames([]);
    setSelectedSetsData([]);
    setDrawCount("");
  };

  const applyDrawPreset = (count) => {
    if (!poolSize) return;
    const next = count === "all" ? poolSize : Math.min(count, poolSize);
    setDrawCount(String(next));
  };

  const handleBuildExam = () => {
    const built = buildExamPayloadFromSelection({
      examTitle,
      targetLevel,
      testDate,
      filterSubject,
      selectedSetNames,
      selectedSetsData,
      drawCount,
      vocaExamType,
    });

    if (!built.ok) {
      setBuildError(built.error);
      return;
    }

    const next = addExamSet(built.data);
    setExamSets(next);
    setExamTitle("");
    setSelectedSetNames([]);
    setSelectedSetsData([]);
    setDrawCount("");
    setBuildError("");
  };

  const handleSaveEdit = (payload) => {
    if (!editTarget?.id) return;

    setSavingEdit(true);
    try {
      const next = updateExamSet(editTarget.id, payload);
      setExamSets(next);
      setEditTarget(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteExam = (exam) => {
    if (!exam?.id) return;

    const { isDeployed, submissionCount } = getExamDeploymentInfo(exam.id);
    const baseMessage = `"${exam.title}" 시험지를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`;

    if (isDeployed) {
      const confirmed = window.confirm(
        `${baseMessage}\n\n⚠️ 이 시험지는 학생 ${submissionCount}명(건)에게 배포·응시된 기록이 있습니다. 삭제하면 시험지와 연결된 응시 데이터는 남지만, 학생 대시보드에서 더 이상 이 시험을 볼 수 없습니다.\n\n정말 삭제하시겠습니까?`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(baseMessage);
      if (!confirmed) return;
    }

    const next = deleteExamSet(exam.id);
    setExamSets(next);
    if (editTarget?.id === exam.id) {
      setEditTarget(null);
    }
  };

  const countUnit = isVocabMode ? "단어" : "문항";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={summaryCard}>
        <h2 style={sectionTitle}>시험지 만들기</h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", lineHeight: 1.6 }}>
          레벨과 과목을 선택한 뒤 <strong>시험 자료명</strong>을 체크하고 출제 문항 수를 입력하세요.
          개별 문항 선택 없이 자료명(세트) 단위로만 시험지가 생성됩니다.
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
                filterSubject
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

        {buildError ? (
          <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{buildError}</p>
        ) : null}

        {!targetLevel ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            먼저 대상 레벨을 선택하면 해당 레벨의 시험 자료명 목록이 표시됩니다.
          </p>
        ) : !filterSubject ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            과목을 선택하면 등록된 시험 자료명 목록이 나타납니다.
          </p>
        ) : setNameList.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            {targetLevel} 레벨 {getSubjectLabel(filterSubject)} 시험 자료가 없습니다. 문제은행
            관리에서 시험 자료명을 입력하고 등록해 주세요.
          </p>
        ) : (
          <>
            <div style={setListHeaderStyle}>
              <h3 style={setListTitleStyle}>시험 자료명 ({setNameList.length})</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" onClick={toggleAllSetNames} style={btnSecondary}>
                  {setNameList.every((entry) => selectedSetNames.includes(entry.setName))
                    ? "전체 해제"
                    : "전체 선택"}
                </button>
                <span style={{ color: "#64748b", fontSize: 14 }}>
                  선택 {selectedSetNames.length}개 · 출제 풀 {poolSize}
                  {countUnit}
                </span>
              </div>
            </div>

            <ul style={setNameListStyle}>
              {setNameList.map((entry) => {
                const isSelected = selectedSetNames.includes(entry.setName);
                return (
                  <li
                    key={entry.setName}
                    style={{
                      ...setNameRowStyle,
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                      borderColor: isSelected ? "#86efac" : "#e2e8f0",
                    }}
                  >
                    <label style={setNameLabelStyle}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSetName(entry.setName)}
                        aria-label={`${entry.setName} 선택`}
                      />
                      <span style={setNameTextStyle}>{entry.setName}</span>
                    </label>
                    <span style={setCountTextStyle}>총 {entry.count}{countUnit}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {filterSubject && selectedSetsData.length > 0 && poolSize > 0 ? (
          <div style={drawOptionsPanelStyle}>
            <h3 style={drawOptionsTitleStyle}>
              {isVocabMode ? "단어 시험 설정" : `${getSubjectLabel(filterSubject)} 출제 설정`}
            </h3>

            {isVocabMode ? (
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
            ) : null}

            <div style={drawOptionBlockStyle}>
              <label style={drawOptionLabelStyle}>
                출제 문항 수
                <input
                  type="number"
                  min={1}
                  max={poolSize}
                  value={drawCount}
                  onChange={(e) => setDrawCount(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 160, marginTop: 8 }}
                />
              </label>
              <div style={drawPresetRowStyle}>
                <button type="button" style={btnSecondary} onClick={() => applyDrawPreset("all")}>
                  전체 ({poolSize})
                </button>
                {(isVocabMode ? [40, 60, 80] : [10, 20, 30]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    style={btnSecondary}
                    disabled={poolSize < preset}
                    onClick={() => applyDrawPreset(preset)}
                  >
                    {preset}개
                  </button>
                ))}
              </div>
              <p style={drawOptionHintStyle}>
                {isVocabMode && vocaExamType === "mix" ? (
                  <>
                    혼합 모드: 총 {drawCount || "—"}문항 중 뜻 쓰기{" "}
                    {getMixExamBreakdown(drawCount).meaningCount}개 + 철자 쓰기{" "}
                    {getMixExamBreakdown(drawCount).spellingCount}개
                  </>
                ) : (
                  <>
                    선택한 {selectedSetNames.length}개 자료(총 {poolSize}
                    {countUnit})에서 무작위로 {drawCount || "—"}개를 추출합니다.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : null}

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
            {examSets.map((exam) => {
              const deployment = getExamDeploymentInfo(exam.id);

              return (
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
                    {exam.setSource?.setNames?.length
                      ? ` · ${exam.setSource.setNames.join(", ")}`
                      : ""}
                    {exam.vocaSource
                      ? ` · Voca ${getVocaExamTypeLabel(exam.vocaSource.examType)}`
                      : ""}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                    {exam.questions.length}문항이 생성되었습니다.
                    {deployment.isDeployed
                      ? ` · 학생 응시 ${deployment.submissionCount}건`
                      : ""}
                  </p>
                  <div style={examCardActionsStyle}>
                    <button
                      type="button"
                      style={btnSecondary}
                      onClick={() => setEditTarget(exam)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      style={examDeleteBtnStyle}
                      onClick={() => handleDeleteExam(exam)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {editTarget ? (
        <ExamSetEditModal
          exam={editTarget}
          onClose={() => {
            if (!savingEdit) setEditTarget(null);
          }}
          onSave={handleSaveEdit}
          saving={savingEdit}
        />
      ) : null}
    </div>
  );
}

const setListHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 12,
};

const setListTitleStyle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  color: "#0f172a",
};

const setNameListStyle = {
  listStyle: "none",
  margin: "0 0 16px",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const setNameRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
};

const setNameLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  flex: 1,
  minWidth: 0,
};

const setNameTextStyle = {
  fontWeight: 700,
  color: "#0f172a",
  fontSize: 15,
  wordBreak: "break-word",
};

const setCountTextStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

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

const examCardActionsStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const examDeleteBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
