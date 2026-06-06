import { useMemo, useState } from "react";
import ReadingPassagePreview from "./ReadingPassagePreview";
import { getSubjectLabel } from "../utils/questionBankStorage";
import { formatPassagesPreviewText, getTextPasteHint } from "../utils/parseQuestionText";
import { getVocabPasteHint } from "../utils/parseVocabText";
import { getWritingPasteHint } from "../utils/parseWritingText";
import { parseSetEditContent, serializeSetContent } from "../utils/setEditFormat";

export default function MaterialSetEditModal({ entry, onClose, onSave, saving = false }) {
  const initialSetName = entry?.setName ?? entry?.name ?? "";
  const initialContent = useMemo(() => serializeSetContent(entry), [entry]);

  const [setName, setSetName] = useState(initialSetName);
  const [contentText, setContentText] = useState(initialContent);
  const [error, setError] = useState("");

  const hint = useMemo(() => {
    if (entry?.kind === "voca") return getVocabPasteHint();
    if (entry?.subject === "writing") return getWritingPasteHint();
    return getTextPasteHint(entry?.subject ?? "grammar");
  }, [entry]);

  const passagePreview = useMemo(() => {
    if (entry?.subject !== "reading" || !contentText.trim()) return "";
    return formatPassagesPreviewText(contentText);
  }, [entry?.subject, contentText]);

  const handleSave = () => {
    const trimmedName = setName.trim();
    if (!trimmedName) {
      setError("세트 제목을 입력해 주세요.");
      return;
    }

    const parsed = parseSetEditContent({ entry, contentText });
    if (!parsed.ok) {
      setError(parsed.errors.slice(0, 3).join("\n"));
      return;
    }

    onSave({
      setName: trimmedName,
      parsed,
    });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={modalStyle}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-set-edit-title"
      >
        <div style={headerStyle}>
          <div>
            <h2 id="material-set-edit-title" style={titleStyle}>
              시험 자료 수정
            </h2>
            <p style={descStyle}>
              {getSubjectLabel(entry?.subject)} · {entry?.count ?? 0}
              {entry?.kind === "voca" ? "단어" : "문항"}
            </p>
          </div>
          <button type="button" onClick={onClose} style={ghostBtnStyle}>
            닫기
          </button>
        </div>

        <label style={fieldLabelStyle}>
          세트 제목
          <input
            type="text"
            value={setName}
            onChange={(event) => {
              setSetName(event.target.value);
              setError("");
            }}
            style={inputStyle}
            placeholder="시험 자료명 (단원/챕터)"
          />
        </label>

        <label style={fieldLabelStyle}>
          문제 및 정답 내용
          <textarea
            value={contentText}
            onChange={(event) => {
              setContentText(event.target.value);
              setError("");
            }}
            style={textareaStyle}
            spellCheck={false}
          />
        </label>

        {entry?.subject === "reading" && (
          <ReadingPassagePreview passage={passagePreview} />
        )}

        <p style={hintStyle}>{hint}</p>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostBtnStyle} disabled={saving}>
            취소
          </button>
          <button type="button" onClick={handleSave} style={saveBtnStyle} disabled={saving}>
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
  width: "min(760px, 100%)",
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
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};

const titleStyle = {
  margin: "0 0 4px",
  fontSize: 20,
  color: "#0f172a",
};

const descStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 14,
};

const fieldLabelStyle = {
  display: "block",
  marginBottom: 14,
  fontWeight: 700,
  color: "#334155",
  fontSize: 14,
};

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 320,
  resize: "vertical",
  lineHeight: 1.7,
  fontFamily: "inherit",
};

const hintStyle = {
  margin: "0 0 12px",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.6,
};

const errorStyle = {
  margin: "0 0 12px",
  color: "#b91c1c",
  fontSize: 13,
  lineHeight: 1.6,
  whiteSpace: "pre-line",
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 8,
};

const ghostBtnStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
};

const saveBtnStyle = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
