import { useMemo, useState } from "react";
import IncorrectAnswerClinicModal from "./IncorrectAnswerClinicModal";
import IncorrectAnswerPrintSheet, {
  triggerIncorrectNotePrint,
} from "./IncorrectAnswerPrintSheet";
import {
  countIncorrectAnswers,
  getIncorrectQuestionItems,
} from "../utils/incorrectAnswerClinic";

export default function IncorrectAnswerTools({
  result,
  studentName,
  layout = "vertical",
  showPrint = true,
  showClinic = true,
  mountPrintSheet = true,
}) {
  const [clinicOpen, setClinicOpen] = useState(false);

  const incorrectCount = useMemo(
    () => countIncorrectAnswers(result),
    [result]
  );
  const incorrectItems = useMemo(
    () => getIncorrectQuestionItems(result),
    [result]
  );

  if (!result || incorrectCount === 0) {
    return (
      <p style={{ margin: "12px 0 0", fontSize: 13, color: "#94a3b8" }}>
        오답 문항이 없어 오답 노트 기능을 사용할 수 없습니다.
      </p>
    );
  }

  const isRow = layout === "row";

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: showPrint && !showClinic ? 0 : 12,
          flexDirection: isRow ? "row" : "column",
          alignItems: isRow ? "center" : "stretch",
        }}
      >
        {showPrint && (
          <button
            type="button"
            onClick={triggerIncorrectNotePrint}
            style={printBtnStyle}
          >
            오답 노트 다운로드 (인쇄)
          </button>
        )}
        {showClinic && (
          <button
            type="button"
            onClick={() => setClinicOpen(true)}
            style={clinicBtnStyle}
          >
            오답 노트 온라인 재응시 ({incorrectCount}문항)
          </button>
        )}
      </div>

      {mountPrintSheet && (showPrint || showClinic) && (
        <IncorrectAnswerPrintSheet
          studentName={studentName}
          testTitle={result.testTitle}
          items={incorrectItems}
        />
      )}

      {clinicOpen && (
        <IncorrectAnswerClinicModal
          result={result}
          studentName={studentName}
          onClose={() => setClinicOpen(false)}
        />
      )}
    </>
  );
}

const printBtnStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const clinicBtnStyle = {
  ...printBtnStyle,
  border: "none",
  background: "#2563eb",
  color: "white",
};
