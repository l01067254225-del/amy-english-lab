import { useMemo, useRef, useState } from "react";
import {
  SUBJECT_OPTIONS,
  addQuestion,
  addQuestionsBulk,
  createPassageId,
  formatQuestionAnswer,
  getSubjectLabel,
  getSubjectMeta,
  loadQuestionBank,
  removeQuestion,
  removeQuestionsBySetId,
  replaceQuestionsForSet,
  removeReadingPassageGroup,
} from "../../utils/questionBankStorage";
import MaterialSetEditModal from "../../components/MaterialSetEditModal";
import ReadingPassagePreview from "../../components/ReadingPassagePreview";
import { parseQuestionCsv, parseQuestionCsvRowPreview } from "../../utils/parseQuestionCsv";
import {
  parseQuestionText,
  getTextPasteExample,
  getTextPasteHint,
  formatPassagesPreviewText,
} from "../../utils/parseQuestionText";
import {
  getVocabPasteExample,
  getVocabPasteHint,
  parseVocabEntries,
} from "../../utils/parseVocabText";
import {
  addVocaSet,
  loadVocaSets,
  removeVocaSet,
  updateVocaSet,
} from "../../utils/vocaSetStorage";
import {
  buildSetCatalog,
  createSetId,
  getSetNamePlaceholder,
  suggestSetName,
} from "../../utils/examSetStorage";
import {
  getWritingPasteExample,
  getWritingPasteHint,
  parseWritingEntries,
} from "../../utils/parseWritingText";
import { getWritingScrambledHint } from "../../utils/writingQuestion";
import { EMPTY_MCQ_OPTIONS, isValidMcqAnswer } from "../../utils/mcqOptions";
import { LEVEL_OPTIONS } from "../../utils/levels";

export default function TeacherQuestionBankTab() {
  const fileInputRef = useRef(null);
  const [questions, setQuestions] = useState(() => loadQuestionBank());
  const [questionType, setQuestionType] = useState("subjective");
  const [subject, setSubject] = useState("vocab");
  const [questionLevel, setQuestionLevel] = useState("");
  const [passage, setPassage] = useState("");
  const [passageId, setPassageId] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [givenWords, setGivenWords] = useState("");
  const [answer, setAnswer] = useState("");
  const [options, setOptions] = useState(EMPTY_MCQ_OPTIONS);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteSubject, setPasteSubject] = useState("grammar");
  const [pasteAnalyzing, setPasteAnalyzing] = useState(false);
  const [materialSetName, setMaterialSetName] = useState("");
  const [vocaSets, setVocaSets] = useState(() => loadVocaSets());
  const [editingEntry, setEditingEntry] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const isReading = subject === "reading";
  const isWriting = subject === "writing";

  const setCatalog = useMemo(
    () =>
      buildSetCatalog({
        questions,
        vocaSets,
        subject: filterSubject === "all" ? "" : filterSubject,
        query: searchQuery,
      }),
    [questions, vocaSets, filterSubject, searchQuery]
  );

  const pastePassagePreview = useMemo(() => {
    if (pasteSubject !== "reading" || !pasteText.trim()) return "";
    return formatPassagesPreviewText(pasteText);
  }, [pasteSubject, pasteText]);

  const handleSubjectChange = (nextSubject) => {
    setSubject(nextSubject);
    if (nextSubject !== "reading") {
      setPassage("");
      setPassageId(null);
    }
    if (nextSubject === "writing") {
      setQuestionType("subjective");
    }
    setGivenWords("");
    setFormError("");
  };

  const handlePassageChange = (value) => {
    setPassage(value);
    if (!value.trim()) {
      setPassageId(null);
      return;
    }
    setPassageId((prev) => prev ?? createPassageId());
  };

  const handleNewPassage = () => {
    setPassage("");
    setPassageId(null);
    setPrompt("");
    setAnswer("");
    setOptions(EMPTY_MCQ_OPTIONS);
    setFormError("");
  };

  const resetForm = () => {
    setPrompt("");
    setGivenWords("");
    setAnswer("");
    setOptions(EMPTY_MCQ_OPTIONS);
    setFormError("");
  };

  const handleAdd = (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setFormError(isWriting ? "문제 본문을 입력해 주세요." : "문제 내용을 입력해 주세요.");
      return;
    }

    if (isWriting) {
      if (!givenWords.trim()) {
        setFormError("주어진 단어를 입력해 주세요.");
        return;
      }
      if (!answer.trim()) {
        setFormError("정답(모범 답안)을 입력해 주세요.");
        return;
      }
    } else if (questionType === "objective") {
      if (options.some((opt) => !opt.trim())) {
        setFormError("객관식 보기 1~5번을 모두 입력해 주세요.");
        return;
      }
      if (!isValidMcqAnswer(answer, options.length)) {
        setFormError("정답은 1~5 사이의 보기 번호로 입력해 주세요.");
        return;
      }
    } else if (!answer.trim()) {
      setFormError("정답을 입력해 주세요.");
      return;
    }

    if (isReading && !passage.trim()) {
      setFormError("Reading 과목은 지문(Passage)을 입력해 주세요.");
      return;
    }

    if (!questionLevel) {
      setFormError("레벨을 선택해 주세요.");
      return;
    }

    const activePassageId = isReading ? passageId ?? createPassageId() : null;
    if (isReading && !passageId) {
      setPassageId(activePassageId);
    }

    const next = addQuestion({
      subject,
      prompt,
      answer,
      type: isWriting ? "writing" : questionType,
      options: questionType === "objective" ? options : [],
      passage: isReading ? passage : "",
      passageId: activePassageId,
      level: questionLevel,
      givenWords: isWriting ? givenWords : "",
    });
    setQuestions(next);
    resetForm();
  };

  const handleDeleteGroup = (groupPassageId) => {
    if (!confirm("이 지문과 연결된 모든 문제를 삭제할까요?")) return;
    setQuestions(removeReadingPassageGroup(groupPassageId));
  };

  const handleDelete = (id) => {
    if (!confirm("이 문제를 삭제할까요?")) return;
    setQuestions(removeQuestion(id));
  };

  const handleDeleteMaterial = (entry) => {
    const label = entry.name || "이 시험 자료";
    if (!confirm(`"${label}" 자료를 삭제할까요?`)) return;

    if (entry.kind === "voca") {
      setVocaSets(removeVocaSet(entry.setId ?? entry.id));
      return;
    }

    setQuestions(removeQuestionsBySetId(entry.setId ?? entry.id));
  };

  const handleEditMaterial = (entry) => {
    setEditingEntry(entry);
  };

  const handleSaveMaterialEdit = ({ setName, parsed }) => {
    if (!editingEntry) return;

    setSavingEdit(true);
    try {
      if (editingEntry.kind === "voca") {
        const nextSets = updateVocaSet(editingEntry.setId, {
          setName,
          level: editingEntry.level,
          words: parsed.words,
        });
        setVocaSets(nextSets);
      } else {
        const nextQuestions = replaceQuestionsForSet(editingEntry.setId, parsed.items, {
          setName,
        });
        setQuestions(nextQuestions);
      }

      const warning =
        parsed.errors?.length > 0
          ? `\n\n건너뛴 항목 ${parsed.errors.length}건:\n${parsed.errors.slice(0, 3).join("\n")}`
          : "";

      alert(`시험 자료 "${setName}"이(가) 수정되었습니다.${warning}`);
      setEditingEntry(null);
    } finally {
      setSavingEdit(false);
    }
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

      const setId = createSetId();
      const setName = suggestSetName(items[0]?.subject ?? "grammar", items[0]?.level ?? "");
      const next = addQuestionsBulk(items, { setId, setName });
      setQuestions(next);
      alert(`시험 자료 "${setName}" — ${items.length}개 문항이 세트로 등록되었습니다.`);
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

  const handlePasteAnalyze = () => {
    if (!pasteText.trim()) {
      alert("붙여넣을 텍스트를 입력해 주세요.");
      return;
    }

    if (!questionLevel) {
      alert("문제 추가 폼에서 레벨을 먼저 선택해 주세요.");
      return;
    }

    setPasteAnalyzing(true);
    try {
      const isVocabPaste = pasteSubject === "vocab";
      const isWritingPaste = pasteSubject === "writing";

      if (isVocabPaste) {
        const { entries, errors } = parseVocabEntries(pasteText);

        if (entries.length === 0) {
          const detail = errors.length ? `\n\n${errors.slice(0, 5).join("\n")}` : "";
          alert(`등록할 Voca 단어를 찾지 못했습니다.${detail}`);
          return;
        }

        const setName = materialSetName.trim() || suggestSetName("vocab", questionLevel);
        const words = entries.map((entry) => ({
          word: entry.word,
          mean: entry.meaning,
        }));

        const nextSets = addVocaSet({
          setName,
          level: questionLevel,
          words,
        });
        setVocaSets(nextSets);
        setPasteText("");
        setMaterialSetName("");

        const errorNote =
          errors.length > 0
            ? `\n\n건너뛴 줄 ${errors.length}건:\n${errors.slice(0, 3).join("\n")}`
            : "";

        alert(
          `시험 자료 "${setName}" — Voca 단어 ${words.length}개가 세트로 등록되었습니다!${errorNote}`
        );
        return;
      }

      if (isWritingPaste) {
        const { entries, errors } = parseWritingEntries(pasteText);

        if (entries.length === 0) {
          const detail = errors.length ? `\n\n${errors.slice(0, 5).join("\n")}` : "";
          alert(`등록할 Writing 문항을 찾지 못했습니다.${detail}`);
          return;
        }

        const resolvedSetName =
          materialSetName.trim() || suggestSetName("writing", questionLevel);
        const setId = createSetId();

        const next = addQuestionsBulk(
          entries.map((item) => ({ ...item, level: questionLevel })),
          {
            setId,
            setName: resolvedSetName,
          }
        );
        setQuestions(next);
        setPasteText("");
        setMaterialSetName("");

        const errorNote =
          errors.length > 0
            ? `\n\n건너뛴 항목 ${errors.length}건:\n${errors.slice(0, 3).join("\n")}`
            : "";

        alert(
          `시험 자료 "${resolvedSetName}" — Writing ${entries.length}문항이 등록되었습니다!${errorNote}`
        );
        return;
      }

      const { items, errors } = parseQuestionText(pasteText, {
        defaultSubject: pasteSubject,
      });

      if (items.length === 0) {
        const detail = errors.length ? `\n\n${errors.slice(0, 5).join("\n")}` : "";
        alert(`등록할 문항을 찾지 못했습니다.${detail}`);
        return;
      }

      const resolvedSetName =
        materialSetName.trim() || suggestSetName(pasteSubject, questionLevel);
      const setId = createSetId();

      const next = addQuestionsBulk(
        items.map((item) => ({ ...item, level: questionLevel })),
        {
          setId,
          setName: resolvedSetName,
        }
      );
      setQuestions(next);
      setPasteText("");
      setMaterialSetName("");

      const errorNote =
        errors.length > 0
          ? `\n\n건너뛴 항목 ${errors.length}건:\n${errors.slice(0, 3).join("\n")}`
          : "";

      alert(
        `시험 자료 "${resolvedSetName}" — 총 ${items.length}개 문항이 등록되었습니다.${errorNote}`
      );
    } finally {
      setPasteAnalyzing(false);
    }
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
          to { opacity: 1; transform: translateY(0); max-height: 420px; }
        }
        @keyframes qbFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .qb-passage-panel,
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
              <p style={panelDescStyle}>
                {isWriting
                  ? "서술형 영작 문항을 등록하세요"
                  : "주관식·객관식 문항을 바로 등록하세요"}
              </p>
            </div>
            {!isWriting && <TypeToggle value={questionType} onChange={setQuestionType} />}
          </div>

          <form onSubmit={handleAdd}>
            <div style={fieldGridStyle}>
              <label style={fieldLabelStyle}>
                과목
                <select
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  style={selectStyle}
                >
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabelStyle}>
                레벨
                <select
                  value={questionLevel}
                  onChange={(e) => setQuestionLevel(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">레벨 선택</option>
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>

              {isReading && (
                <div className="qb-passage-panel" style={{ gridColumn: "1 / -1" }}>
                  <div style={passageHeaderRowStyle}>
                    <label style={{ ...fieldLabelStyle, flex: 1, marginBottom: 0 }}>
                      지문 (Passage)
                      <textarea
                        value={passage}
                        onChange={(e) => handlePassageChange(e.target.value)}
                        placeholder="독해 지문 전체를 입력하세요. 동일 지문으로 여러 문제를 연속 등록할 수 있습니다."
                        style={passageTextareaStyle}
                      />
                    </label>
                  </div>
                  <div style={passageMetaRowStyle}>
                    <span style={passageMetaStyle}>
                      {passageId
                        ? "현재 지문 그룹 ID가 연결되어 있습니다. 같은 지문으로 문제를 계속 추가할 수 있어요."
                        : "지문을 입력하면 문제들이 하나의 독해 세트로 묶입니다."}
                    </span>
                    {passage.trim() && (
                      <button type="button" onClick={handleNewPassage} style={newPassageBtnStyle}>
                        새 지문 시작
                      </button>
                    )}
                  </div>
                  <ReadingPassagePreview passage={passage} />
                </div>
              )}

              {isWriting ? (
                <>
                  <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
                    문제 본문
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder='예: "나는 매일 학교에 간다."'
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
                    주어진 단어
                    <input
                      type="text"
                      value={givenWords}
                      onChange={(e) => setGivenWords(e.target.value)}
                      placeholder="예: I, go, school, every day"
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
                    정답 (모범 답안)
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="예: I go to school every day."
                      style={inputStyle}
                    />
                  </label>
                </>
              ) : (
                <>
              <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
                {isReading ? "문제 (지문 하위 문항)" : "문제 (단어 / 문장)"}
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
                  <p style={optionsLabelStyle}>보기 입력 (1~5번)</p>
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
                      ? "보기 번호 입력 (1 ~ 5)"
                      : "예: Seoul / I go to school."
                  }
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  {questionType === "objective"
                    ? "객관식은 정답 보기 번호(1, 2, 3, 4, 5)를 입력하세요."
                    : "주관식은 정답 텍스트를 그대로 입력하세요."}
                </span>
              </label>
                </>
              )}
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
            <code style={csvFormatStyle}>{parseQuestionCsvRowPreview()}</code>
            <p style={dropExampleStyle}>
              주관식: apple,사과,Voca &nbsp;·&nbsp; 객관식(4지): 문제,2,Grammar,A,B,C,D
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

      {/* ── 텍스트 붙여넣기 일괄 등록 ── */}
      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>텍스트 복사 붙여넣기로 등록</h2>
            <p style={panelDescStyle}>
              한글(HWP)·PDF에서 복사한 문제 텍스트를 붙여넣고 자동 분석 등록
            </p>
          </div>
          <label style={{ ...fieldLabelStyle, minWidth: 140, marginBottom: 0 }}>
            기본 과목
            <select
              value={pasteSubject}
              onChange={(e) => setPasteSubject(e.target.value)}
              style={{ ...selectStyle, marginTop: 0 }}
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ ...fieldLabelStyle, marginBottom: 12, display: "block" }}>
          시험 자료명 (단원/챕터)
          <input
            type="text"
            value={materialSetName}
            onChange={(e) => setMaterialSetName(e.target.value)}
            placeholder={getSetNamePlaceholder(pasteSubject, questionLevel)}
            style={selectStyle}
          />
        </label>

        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={
            pasteSubject === "vocab"
              ? getVocabPasteExample()
              : pasteSubject === "writing"
                ? getWritingPasteExample()
                : getTextPasteExample(pasteSubject)
          }
          style={pasteTextareaStyle}
        />

        {pasteSubject === "reading" && (
          <ReadingPassagePreview passage={pastePassagePreview} />
        )}

        <div style={pasteFooterStyle}>
          <p style={pasteHintStyle}>
            {pasteSubject === "vocab"
              ? getVocabPasteHint()
              : pasteSubject === "writing"
                ? getWritingPasteHint()
                : getTextPasteHint(pasteSubject)}
          </p>
          <button
            type="button"
            onClick={handlePasteAnalyze}
            disabled={pasteAnalyzing}
            style={analyzeBtnStyle}
          >
            {pasteAnalyzing ? "분석 중..." : "AI 분석 등록"}
          </button>
        </div>
      </section>

      {/* ── 문제 목록 ── */}
      <section style={panelStyle}>
        <div style={listHeaderStyle}>
          <div>
            <h2 style={panelTitleStyle}>문제은행 목록</h2>
            <p style={panelDescStyle}>
              총 {questions.length}문항 · Voca {vocaSets.length}세트 · 표시 세트 {setCatalog.length}개
            </p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문제, 정답, 지문, 보기 검색..."
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

        {setCatalog.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <h3 style={vocaSetSectionTitleStyle}>시험 자료 세트 ({setCatalog.length})</h3>
            <div style={cardListStyle}>
              {setCatalog.map((entry) => (
                <MaterialSetCard
                  key={`${entry.kind}-${entry.setId}`}
                  entry={entry}
                  onEdit={handleEditMaterial}
                  onDelete={handleDeleteMaterial}
                  onDeleteQuestion={handleDelete}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>
              {questions.length === 0 && vocaSets.length === 0
                ? "등록된 시험 자료가 없습니다."
                : "검색 결과가 없습니다."}
            </p>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 14 }}>
              위에서 시험 자료명을 입력하고 CSV·텍스트 붙여넣기로 세트를 등록해 보세요.
            </p>
          </div>
        )}
      </section>

      {editingEntry ? (
        <MaterialSetEditModal
          entry={editingEntry}
          saving={savingEdit}
          onClose={() => {
            if (!savingEdit) setEditingEntry(null);
          }}
          onSave={handleSaveMaterialEdit}
        />
      ) : null}
    </div>
  );
}

function MaterialSetCard({ entry, onEdit, onDelete, onDeleteQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const subjectMeta = getSubjectMeta(entry.subject);
  const countLabel = entry.kind === "voca" ? `단어 ${entry.count}개` : `문항 ${entry.count}개`;

  return (
    <article
      style={{
        ...cardStyle,
        borderLeft: `4px solid ${subjectMeta.color}`,
        background: subjectMeta.bg,
      }}
    >
      <div style={cardTopStyle}>
        <div style={badgeRowStyle}>
          <span
            style={{
              ...subjectBadgeStyle,
              color: subjectMeta.color,
              background: "white",
            }}
          >
            {getSubjectLabel(entry.subject)} · 시험 자료
          </span>
          <span style={readingCountBadgeStyle}>{countLabel}</span>
          {entry.level ? <span style={levelBadgeStyle}>{entry.level}</span> : null}
          {entry.isAutoSet ? <span style={autoSetChipStyle}>자동 생성</span> : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setExpanded((prev) => !prev)} style={expandBtnStyle}>
            {expanded ? "접기" : "문항 보기"}
          </button>
          <button type="button" onClick={() => onEdit(entry)} style={expandBtnStyle}>
            수정
          </button>
          <button type="button" onClick={() => onDelete(entry)} style={deleteBtnStyle}>
            삭제
          </button>
        </div>
      </div>

      <h3 style={vocaSetNameStyle}>{entry.setName ?? entry.name}</h3>
      <p style={vocaSetMetaStyle}>
        {entry.createdAt
          ? `${new Date(entry.createdAt).toLocaleDateString("ko-KR")} 등록`
          : "등록일 미상"}
      </p>

      {entry.preview ? (
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.7, fontSize: 14 }}>{entry.preview}</p>
      ) : null}

      {expanded ? (
        <div style={setItemsPanelStyle}>
          {entry.kind === "voca" ? (
            <ul style={setItemsListStyle}>
              {(entry.words ?? []).map((word, index) => (
                <li key={`${word.word}-${index}`}>
                  {word.word} — {word.mean}
                </li>
              ))}
            </ul>
          ) : (
            <ul style={setItemsListStyle}>
              {(entry.questions ?? []).map((question) => (
                <li key={question.id} style={setQuestionItemStyle}>
                  <div style={{ flex: 1 }}>
                    {question.subject === "reading" &&
                    (question.readingPassage ?? question.passage) ? (
                      <p style={setPassagePreviewStyle}>
                        {question.readingPassage ?? question.passage}
                      </p>
                    ) : null}
                    <strong style={{ color: "#334155" }}>{question.prompt}</strong>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                      정답: {formatQuestionAnswer(question)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(question.id)}
                    style={inlineDeleteBtnStyle}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
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

function ReadingPassageGroupCard({ passage, passageNumber, questions, onDeleteQuestion, onDeleteGroup }) {
  const subjectMeta = getSubjectMeta("reading");
  const groupLabel = passageNumber ? `지문 ${passageNumber}` : "Reading · 지문 세트";

  return (
    <article
      style={{
        ...cardStyle,
        borderLeft: `4px solid ${subjectMeta.color}`,
        background: "#f5f3ff",
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
            Reading · {groupLabel}
          </span>
          <span style={readingCountBadgeStyle}>문항 {questions.length}개</span>
        </div>
        <button
          type="button"
          onClick={() => onDeleteGroup(questions[0]?.passageId)}
          style={deleteBtnStyle}
        >
          세트 삭제
        </button>
      </div>

      <div style={passagePreviewBoxStyle}>
        <span style={passagePreviewLabelStyle}>지문 미리보기</span>
        <p style={passagePreviewFullTextStyle}>{passage}</p>
      </div>

      <div style={nestedQuestionsStyle}>
        {questions.map((question, index) => (
          <div key={question.id} style={nestedQuestionWrapStyle}>
            <div style={nestedQuestionHeaderStyle}>
              <span style={nestedQuestionNumStyle}>Q{index + 1}</span>
              <button
                type="button"
                onClick={() => onDeleteQuestion(question.id)}
                style={nestedDeleteBtnStyle}
              >
                삭제
              </button>
            </div>
            <QuestionCardBody question={question} compact />
          </div>
        ))}
      </div>
    </article>
  );
}

function QuestionCard({ question, onDelete }) {
  const subjectMeta = getSubjectMeta(question.subject);
  const isObjective = question.type === "objective";
  const isWritingItem = question.type === "writing";
  const showPassageSnippet =
    question.subject === "reading" && question.passage && !question.passageId;

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
            {isWritingItem
              ? "서술형 영작"
              : isObjective
                ? question.options.length >= 5
                  ? "객관식 · 5지"
                  : "객관식 · 4지"
                : "주관식"}
          </span>
        </div>
        <button type="button" onClick={() => onDelete(question.id)} style={deleteBtnStyle}>
          삭제
        </button>
      </div>

      {showPassageSnippet && (
        <div style={passagePreviewBoxStyle}>
          <span style={passagePreviewLabelStyle}>지문</span>
          <p style={passagePreviewFullTextStyle}>
            {question.readingPassage ?? question.passage}
          </p>
        </div>
      )}

      <QuestionCardBody question={question} />
    </article>
  );
}

function QuestionCardBody({ question, compact = false }) {
  const isObjective = question.type === "objective";
  const isWritingItem = question.type === "writing";

  return (
    <>
      <p style={compact ? nestedPromptStyle : promptStyle}>{question.prompt}</p>

      {isWritingItem && getWritingScrambledHint(question) ? (
        <div style={writingGivenWordsBoxStyle}>
          <span style={writingGivenWordsLabelStyle}>스크램블 힌트</span>
          <span>{getWritingScrambledHint(question)}</span>
        </div>
      ) : null}

      {isWritingItem && question.referenceSentence ? (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
          기준 문장: {question.referenceSentence}
        </p>
      ) : null}

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
    </>
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

const expandBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  flexShrink: 0,
};

const autoSetChipStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#92400e",
  background: "#fef3c7",
  borderRadius: 999,
  padding: "3px 8px",
};

const setItemsPanelStyle = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  background: "white",
  border: "1px solid #e2e8f0",
};

const setItemsListStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "#475569",
  lineHeight: 1.7,
};

const setQuestionItemStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 10,
};

const setPassagePreviewStyle = {
  margin: "0 0 6px",
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const inlineDeleteBtnStyle = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid #fecaca",
  background: "white",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 11,
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

const pasteTextareaStyle = {
  width: "100%",
  minHeight: 220,
  padding: "16px 18px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  fontSize: 14,
  lineHeight: 1.7,
  color: "#0f172a",
  background: "#fafbfc",
  resize: "vertical",
  fontFamily: "Consolas, 'Malgun Gothic', monospace",
};

const pasteFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginTop: 14,
  flexWrap: "wrap",
};

const pasteHintStyle = {
  margin: 0,
  flex: 1,
  minWidth: 240,
  fontSize: 13,
  color: "#94a3b8",
  lineHeight: 1.6,
};

const analyzeBtnStyle = {
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 14,
  boxShadow: "0 8px 20px rgba(124, 58, 237, 0.25)",
  whiteSpace: "nowrap",
};

const passageTextareaStyle = {
  width: "100%",
  minHeight: 140,
  marginTop: 8,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #ddd6fe",
  boxSizing: "border-box",
  fontSize: 14,
  lineHeight: 1.75,
  color: "#0f172a",
  background: "#faf5ff",
  resize: "vertical",
  fontFamily: "'Malgun Gothic', Arial, sans-serif",
};

const passageHeaderRowStyle = {
  display: "flex",
  gap: 12,
  alignItems: "stretch",
};

const passageMetaRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 10,
  flexWrap: "wrap",
};

const passageMetaStyle = {
  fontSize: 12,
  color: "#7c3aed",
  fontWeight: 600,
  lineHeight: 1.5,
};

const newPassageBtnStyle = {
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid #ddd6fe",
  background: "white",
  color: "#6d28d9",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};

const readingCountBadgeStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background: "#ede9fe",
  color: "#5b21b6",
};

const levelBadgeStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background: "#e0e7ff",
  color: "#3730a3",
};

const vocaSetSectionTitleStyle = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 800,
  color: "#312e81",
};

const vocaSetNameStyle = {
  margin: "0 0 6px",
  fontSize: 17,
  fontWeight: 800,
  color: "#0f172a",
};

const vocaSetMetaStyle = {
  margin: "0 0 12px",
  fontSize: 13,
  color: "#64748b",
};

const vocaWordPreviewStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "#475569",
  lineHeight: 1.7,
  fontSize: 14,
};

const writingGivenWordsBoxStyle = {
  marginBottom: 10,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  lineHeight: 1.6,
  fontSize: 14,
};

const writingGivenWordsLabelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 4,
  color: "#047857",
};

const passagePreviewBoxStyle = {
  marginBottom: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "white",
  border: "1px solid #e9d5ff",
};

const passagePreviewLabelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  color: "#7c3aed",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const passagePreviewTextStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.7,
  color: "#475569",
};

const passagePreviewFullTextStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.85,
  color: "#1e293b",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const nestedQuestionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const nestedQuestionWrapStyle = {
  background: "white",
  borderRadius: 12,
  padding: "14px 16px",
  border: "1px solid #e9d5ff",
};

const nestedQuestionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

const nestedQuestionNumStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7c3aed",
  background: "#f5f3ff",
  padding: "4px 10px",
  borderRadius: 999,
};

const nestedDeleteBtnStyle = {
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "white",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 11,
};

const nestedPromptStyle = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
  lineHeight: 1.5,
};
