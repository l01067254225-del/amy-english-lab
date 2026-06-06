import { useMemo, useState } from "react";
import IncorrectAnswerClinicModal from "./IncorrectAnswerClinicModal";
import IncorrectAnswerPrintSheet, {
  triggerIncorrectNotePrint,
} from "./IncorrectAnswerPrintSheet";
import {
  countIncorrectAnswers,
  getClinicRetestSummary,
  getIncorrectItemsForPrint,
  isClinicRetestCompleted,
} from "../utils/incorrectAnswerClinic";

export default function IncorrectAnswerTools({
  result,
  studentName,
  layout = "vertical",
  showPrint = true,
  showClinic = true,
  mountPrintSheet = true,
  onResultUpdate,
}) {
  const [clinicOpen, setClinicOpen] = useState(false);

  const incorrectCount = useMemo(
    () => countIncorrectAnswers(result),
    [result]
  );
  const printItems = useMemo(
    () => getIncorrectItemsForPrint(result),
    [result]
  );
  const clinicRetestSummary = useMemo(
    () => getClinicRetestSummary(result),
    [result]
  );
  const clinicCompleted = useMemo(
    () => isClinicRetestCompleted(result),
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

  const handleClinicSaved = (updatedResult) => {
    onResultUpdate?.(updatedResult);
    setClinicOpen(false);
  };

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
        {showClinic && !clinicCompleted && (
          <button
            type="button"
            onClick={() => setClinicOpen(true)}
            style={clinicBtnStyle}
          >
            오답 노트 온라인 재응시 ({incorrectCount}문항)
          </button>
        )}
        {showClinic && clinicCompleted && (
          <p style={clinicDoneStyle}>
            온라인 재응시 완료 ({clinicRetestSummary?.correctCount ?? 0}/
            {clinicRetestSummary?.totalCount ?? incorrectCount} 정답) · 1회 제한으로
            재응시할 수 없습니다.
          </p>
        )}
      </div>

      {mountPrintSheet && (showPrint || showClinic) && (
        <IncorrectAnswerPrintSheet
          studentName={studentName}
          testTitle={result.testTitle}
          items={printItems}
          clinicRetestSummary={clinicRetestSummary}
        />
      )}

      {clinicOpen && !clinicCompleted && (
        <IncorrectAnswerClinicModal
          result={result}
          studentName={studentName}
          onClose={() => setClinicOpen(false)}
          onSaved={handleClinicSaved}
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

const clinicDoneStyle = {
  margin: 0,
  padding: "10px 14px",
  borderRadius: 10,
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.5,
};
