import { formatDate } from "../../services/resultsApi";
import {
  btnSecondary,
  dashboardGrid,
  sectionTitle,
  summaryCard,
  tableStyle,
  thTdStyle,
} from "./teacherStyles";

export default function TeacherResultsTab({
  studentSummary,
  results,
  loading,
  onRefresh,
  onClearAll,
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={onRefresh} style={btnSecondary} disabled={loading}>
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
        <button
          type="button"
          onClick={onClearAll}
          style={{ ...btnSecondary, color: "#b91c1c", borderColor: "#fecaca" }}
        >
          전체 성적 삭제
        </button>
      </div>

      <div style={dashboardGrid}>
        <div style={summaryCard}>
          <h2 style={sectionTitle}>학생 제출 현황</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>학생 이름</th>
                <th style={thTdStyle}>ID</th>
                <th style={thTdStyle}>제출 여부</th>
                <th style={thTdStyle}>최신 점수</th>
                <th style={thTdStyle}>시험</th>
                <th style={thTdStyle}>제출 시간</th>
              </tr>
            </thead>
            <tbody>
              {studentSummary.map((row) => (
                <tr key={row.id}>
                  <td style={thTdStyle}>{row.name}</td>
                  <td style={thTdStyle}>{row.id}</td>
                  <td style={thTdStyle}>{row.submitted ? "제출" : "미제출"}</td>
                  <td style={thTdStyle}>
                    {row.latest ? `${row.latest.score}/${row.latest.total}` : "-"}
                  </td>
                  <td style={thTdStyle}>{row.latest?.testTitle ?? "-"}</td>
                  <td style={thTdStyle}>
                    {row.latest ? formatDate(row.latest.submittedAt) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={summaryCard}>
          <h2 style={sectionTitle}>전체 제출 내역</h2>
          {results.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>아직 제출된 시험이 없습니다.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thTdStyle}>학생</th>
                    <th style={thTdStyle}>시험</th>
                    <th style={thTdStyle}>점수</th>
                    <th style={thTdStyle}>제출 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.id}>
                      <td style={thTdStyle}>{item.studentName}</td>
                      <td style={thTdStyle}>{item.testTitle}</td>
                      <td style={thTdStyle}>
                        {item.score}/{item.total}
                      </td>
                      <td style={thTdStyle}>{formatDate(item.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
