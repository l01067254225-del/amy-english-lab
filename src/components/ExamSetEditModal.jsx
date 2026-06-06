import { useEffect, useMemo, useState } from "react";
import {
  filterQuestionsByLevel,
  getSubjectLabel,
  loadQuestionBank,
  SUBJECT_OPTIONS,
} from "../utils/questionBankStorage";
import { buildExamPayloadFromSelection, resolveExamSubject } from "../utils/examSetBuilder";
import { buildSetNameList } from "../utils/examSetStorage";
import { LEVEL_OPTIONS } from "../utils/levels";
import { getMixExamBreakdown, VOCA_EXAM_TYPES } from "../utils/vocaExamBuilder";
import { filterVocaSetsByLevel, loadVocaSets } from "../utils/vocaSetStorage";
import { btnPrimary, btnSecondary, inputStyle, labelStyle } from "../pages/teacher/teacherStyles";

function getVocaExamTypeLabel(examType) {
  return VOCA_EXAM_TYPES.find((item) => item.id === examType)?.label ?? examType;
}

export default function ExamSetEditModal({ exam, onClose, onSave, saving = false }) {
  const initialSubject = resolveExamSubject(exam);

  const [examTitle, setExamTitle] = useState(exam?.title ?? "");
  const [targetLevel, setTargetLevel] = useState(exam?.targetLevel ?? "");
  const [testDate, setTestDate] = useState(exam?.testDate ?? "");
  const [filterSubject, setFilterSubject] = useState(initialSubject);
  const [selectedSetNames, setSelectedSetNames] = useState(
    () => exam?.setSource?.setNames ?? []
  );
  const [selectedSetsData, setSelectedSetsData] = useState([]);
  const [vocaExamType, setVocaExamType] = useState(
    exam?.vocaSource?.examType ?? exam?.setSource?.examType ?? "meaning"
  );
  const [drawCount, setDrawCount] = useState(() => {
    const count =
      exam?.setSource?.drawCount ??
      exam?.vocaSource?.drawCount ??
      exam?.materialSource?.drawCount ??
      exam?.questions?.length ??
      "";
    return count ? String(count) : "";
  });
  const [error, setError] = useState("");

  const questionBank = useMemo(() => loadQuestionBank(), []);
  const vocaSets = useMemo(() => loadVocaSets(), []);

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

  const countUnit = isVocabMode ? "단어" : "문항";

  const toggleSetName = (setName) => {
    setSelectedSetNames((prev) =>
      prev.includes(setName) ? prev.filter((name) => name !== setName) : [...prev, setName]
    );
  };

  const applyDrawPreset = (count) => {
    if (!poolSize) return;
    const next = count === "all" ? poolSize : Math.min(count, poolSize);
    setDrawCount(String(next));
  };

  const handleSave = () => {
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
      setError(built.error);
      return;
    }

    onSave(built.data);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={modalStyle}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-set-edit-title"
      >
        <div style={headerStyle}>
          <div>
            <h2 id="exam-set-edit-title" style={titleStyle}>
              시험지 수정
            </h2>
            <p style={descStyle}>
              {exam?.questions?.length ?? 0}문항 · 생성{" "}
              {exam?.createdAt
                ? new Date(exam.createdAt).toLocaleString("ko-KR")
                : "—"}
            </p>
          </div>
          <button type="button" onClick={onClose} style={ghostBtnStyle} disabled={saving}>
            닫기
          </button>
        </div>

        <div style={fieldGridStyle}>
          <label style={labelStyle}>
            시험지 제목
            <input
              type="text"
              value={examTitle}
              onChange={(e) => {
                setExamTitle(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            대상 레벨
            <select
              value={targetLevel}
              onChange={(e) => {
                setTargetLevel(e.target.value);
                setSelectedSetNames([]);
                setError("");
              }}
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
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setSelectedSetNames([]);
                setError("");
              }}
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
              onChange={(e) => {
                setTestDate(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        {targetLevel && filterSubject && setNameList.length > 0 ? (
          <>
            <h3 style={sectionHeadingStyle}>
              시험 자료명 ({setNameList.length})
            </h3>
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
                      />
                      <span>{entry.setName}</span>
                    </label>
                    <span style={setCountStyle}>
                      총 {entry.count}
                      {countUnit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : targetLevel && filterSubject ? (
          <p style={hintStyle}>해당 조건의 시험 자료가 없습니다.</p>
        ) : null}

        {filterSubject && selectedSetsData.length > 0 && poolSize > 0 ? (
          <div style={drawPanelStyle}>
            {isVocabMode ? (
              <div style={{ marginBottom: 12 }}>
                <span style={drawLabelStyle}>시험 유형</span>
                <div style={radioRowStyle}>
                  {VOCA_EXAM_TYPES.map((item) => (
                    <label key={item.id} style={radioLabelStyle}>
                      <input
                        type="radio"
                        name="editVocaExamType"
                        checked={vocaExamType === item.id}
                        onChange={() => setVocaExamType(item.id)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <label style={drawLabelStyle}>
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
            <div style={presetRowStyle}>
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
            {isVocabMode && vocaExamType === "mix" ? (
              <p style={hintStyle}>
                혼합: 뜻 {getMixExamBreakdown(drawCount).meaningCount} + 철자{" "}
                {getMixExamBreakdown(drawCount).spellingCount}
              </p>
            ) : (
              <p style={hintStyle}>
                {getSubjectLabel(filterSubject)} · 선택 {selectedSetNames.length}개 자료에서{" "}
                {drawCount || "—"}개 추출
              </p>
            )}
          </div>
        ) : null}

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={btnSecondary} disabled={saving}>
            취소
          </button>
          <button type="button" onClick={handleSave} style={btnPrimary} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 1200,
};

const modalStyle = {
  width: "min(720px, 100%)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const titleStyle = {
  margin: "0 0 4px",
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const descStyle = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
};

const ghostBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const sectionHeadingStyle = {
  margin: "0 0 10px",
  fontSize: 15,
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
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
};

const setNameLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  flex: 1,
  fontWeight: 700,
  color: "#0f172a",
};

const setCountStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

const drawPanelStyle = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
};

const drawLabelStyle = {
  display: "block",
  fontWeight: 700,
  color: "#334155",
  fontSize: 14,
};

const radioRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 8,
};

const radioLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 600,
  fontSize: 14,
};

const presetRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const hintStyle = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "#64748b",
};

const errorStyle = {
  margin: "0 0 12px",
  color: "#b91c1c",
  fontSize: 14,
  whiteSpace: "pre-wrap",
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 8,
};
