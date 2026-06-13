import { useMemo } from "react";
import { formatDate } from "../services/resultsApi";
import {
  countIncorrectAnswers,
  getClinicRetestSummary,
  getIncorrectItemsForPrint,
  getIncorrectQuestionItems,
} from "../utils/incorrectAnswerClinic";
import IncorrectAnswerNotePreview from "./IncorrectAnswerNotePreview";
import IncorrectAnswerPrintSheet, {
  triggerIncorrectNotePrint,
} from "./IncorrectAnswerPrintSheet";
import "../styles/incorrectAnswerPrint.css";

export default function IncorrectAnswerNoteModal({ result, studentName, onClose }) {
  const items = useMemo(() => getIncorrectQuestionItems(result), [result]);
  const printItems = useMemo(() => getIncorrectItemsForPrint(result), [result]);
  const incorrectCount = useMemo(() => countIncorrectAnswers(result), [result]);
  const clinicRetestSummary = useMemo(() => getClinicRetestSummary(result), [result]);

  if (!result) return null;

  const submittedLabel = formatDate(result.submittedAt);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={modalStyle}
        className="incorrect-note-no-print"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="오답 노트"
      >
        <div style={toolbarStyle}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a" }}>오답 노트</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              {studentName} · {result.testTitle} · 틀린 문항 {incorrectCount}개
            </p>
          </div>
          <div style={actionRowStyle}>
            {incorrectCount > 0 && (
              <button type="button" onClick={triggerIncorrectNotePrint} style={printBtnStyle}>
                인쇄
              </button>
            )}
            <button type="button" onClick={onClose} style={closeBtnStyle}>
              닫기
            </button>
          </div>
        </div>

        <div style={previewWrapStyle}>
          <IncorrectAnswerNotePreview
            items={items}
            studentName={studentName}
            testTitle={result.testTitle}
            submittedAt={submittedLabel}
          />
        </div>
      </div>

      {incorrectCount > 0 && (
        <IncorrectAnswerPrintSheet
          studentName={studentName}
          testTitle={result.testTitle}
          items={printItems}
          clinicRetestSummary={clinicRetestSummary}
        />
      )}
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
  zIndex: 1050,
};

const modalStyle = {
  width: "min(820px, 100%)",
  maxHeight: "92vh",
  background: "white",
  borderRadius: 16,
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  padding: "20px 24px 12px",
  borderBottom: "1px solid #e2e8f0",
  flexShrink: 0,
};

const actionRowStyle = {
  display: "flex",
  gap: 8,
  flexShrink: 0,
};

const previewWrapStyle = {
  overflow: "auto",
  padding: "16px 24px 24px",
};

const printBtnStyle = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const closeBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};
