import { useMemo, useState } from "react";
import IncorrectAnswerClinicModal from "./IncorrectAnswerClinicModal";
import IncorrectAnswerPrintSheet, {
  triggerIncorrectNotePrint,
} from "./IncorrectAnswerPrintSheet";
import {
  canClinicRetest,
  countIncorrectAnswers,
  getClinicRetestButtonLabel,
  getClinicRetestSummary,
  getIncorrectItemsForPrint,
  isClinicRetestAllCorrect,
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
  const clinicAvailable = useMemo(
    () => canClinicRetest(result),
    [result]
  );
  const clinicButtonLabel = useMemo(
    () => getClinicRetestButtonLabel(result, incorrectCount),
    [result, incorrectCount]
  );
  const allCorrect = useMemo(
    () => isClinicRetestAllCorrect(result),
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
        {showClinic && clinicAvailable && (
          <button
            type="button"
            onClick={() => setClinicOpen(true)}
            style={clinicBtnStyle}
          >
            {clinicButtonLabel}
          </button>
        )}
        {showClinic && !clinicAvailable && clinicRetestSummary && allCorrect && (
          <p style={clinicSuccessStyle}>
            온라인 재응시 완료 · 모든 오답을 맞혔습니다 (
            {clinicRetestSummary.correctCount}/{clinicRetestSummary.totalCount} 정답)
          </p>
        )}
        {showClinic && !clinicAvailable && clinicRetestSummary && !allCorrect && (
          <p style={clinicDoneStyle}>
            재응시 횟수를 모두 사용했습니다 · 최종{" "}
            {clinicRetestSummary.correctCount}/{clinicRetestSummary.totalCount} 정답
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

      {clinicOpen && clinicAvailable && (
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
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.5,
};

const clinicSuccessStyle = {
  ...clinicDoneStyle,
  background: "#ecfdf5",
  borderColor: "#bbf7d0",
  color: "#047857",
};
