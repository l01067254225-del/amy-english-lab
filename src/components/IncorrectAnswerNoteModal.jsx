import IncorrectAnswerTools from "./IncorrectAnswerTools";

export default function IncorrectAnswerNoteModal({ result, studentName, onClose, onResultUpdate }) {
  if (!result) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>오답 노트</h2>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            닫기
          </button>
        </div>
        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}>
          {studentName} · {result.testTitle}
        </p>
        <IncorrectAnswerTools
          result={result}
          studentName={studentName}
          layout="vertical"
          onResultUpdate={onResultUpdate}
        />
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
  zIndex: 1050,
};

const modalStyle = {
  width: "min(480px, 100%)",
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 8,
};

const closeBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
};
