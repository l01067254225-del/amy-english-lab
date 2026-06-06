import {
  buildLevelCompareFeedback,
  getLevelTestAverage,
  getStudentLevel,
  toPercent,
} from "../utils/levelStats";

export default function StudentLevelCompareDashboard({
  studentId,
  result,
  level: levelProp,
  myScoreTitle = "내 성적",
  showFeedback = true,
  className = "",
}) {
  if (!result) {
    return (
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        비교할 성적 데이터가 없습니다.
      </p>
    );
  }

  const level = levelProp || getStudentLevel(studentId);
  const stats = getLevelTestAverage(result.testId, level, {
    excludeStudentId: studentId,
  });

  const myScore = Number(result.score ?? 0);
  const myTotal = Number(result.total ?? 0);
  const avgScore = stats.averageScore;
  const avgTotal = stats.total ?? myTotal;
  const myPercent = toPercent(myScore, myTotal);
  const avgPercent = avgScore != null ? toPercent(avgScore, avgTotal) : 0;

  const feedback = buildLevelCompareFeedback({
    myScore,
    averageScore: avgScore,
    level,
    sampleSize: stats.sampleSize,
  });

  return (
    <div className={className} style={wrapStyle}>
      <div style={gridStyle}>
        <ScoreCard
          title={myScoreTitle}
          subtitle={result.testTitle}
          score={myScore}
          total={myTotal}
          percent={myPercent}
          barColor="#2563eb"
          trackColor="#dbeafe"
          accentColor="#1d4ed8"
        />
        <ScoreCard
          title={`${level || "동일 레벨"} 평균`}
          subtitle={
            stats.sampleSize > 0
              ? `같은 레벨 ${stats.sampleSize}명 기준`
              : "비교 데이터 없음"
          }
          score={avgScore ?? "-"}
          total={avgTotal}
          percent={avgPercent}
          barColor="#94a3b8"
          trackColor="#e2e8f0"
          accentColor="#64748b"
          isAverage={avgScore == null}
        />
      </div>
      {showFeedback && <p style={feedbackStyle}>{feedback}</p>}
    </div>
  );
}

function ScoreCard({
  title,
  subtitle,
  score,
  total,
  percent,
  barColor,
  trackColor,
  accentColor,
  isAverage = false,
}) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={cardTitleStyle}>{title}</span>
        <span style={cardSubtitleStyle}>{subtitle}</span>
      </div>

      <div style={scoreRowStyle}>
        <span style={{ ...bigScoreStyle, color: accentColor }}>
          {isAverage ? "-" : score}
        </span>
        {!isAverage && <span style={totalLabelStyle}>/ {total}점</span>}
      </div>

      <div style={{ ...trackStyle, background: trackColor }}>
        <div
          style={{
            ...barStyle,
            width: `${percent}%`,
            background: barColor,
          }}
        />
      </div>

      <div style={percentLabelStyle}>{isAverage ? "—" : `${Math.round(percent)}%`}</div>

      <RingChart percent={percent} color={barColor} trackColor={trackColor} dimmed={isAverage} />
    </div>
  );
}

function RingChart({ percent, color, trackColor, dimmed }) {
  const radius = 42;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} style={{ display: "block", margin: "12px auto 0" }}>
      <circle
        stroke={trackColor}
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <g transform={`rotate(-90 ${radius} ${radius})`}>
        <circle
          stroke={dimmed ? trackColor : color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dimmed ? circumference : offset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </g>
    </svg>
  );
}

const wrapStyle = {
  marginTop: 0,
  paddingTop: 0,
  borderTop: "none",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const cardStyle = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "18px 18px 14px",
};

const cardHeaderStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 12,
};

const cardTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#0f172a",
};

const cardSubtitleStyle = {
  fontSize: 12,
  color: "#94a3b8",
};

const scoreRowStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  marginBottom: 12,
};

const bigScoreStyle = {
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1,
};

const totalLabelStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "#64748b",
};

const trackStyle = {
  width: "100%",
  height: 10,
  borderRadius: 999,
  overflow: "hidden",
};

const barStyle = {
  height: "100%",
  borderRadius: 999,
  transition: "width 0.35s ease",
};

const percentLabelStyle = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#64748b",
  textAlign: "right",
};

const feedbackStyle = {
  margin: "14px 0 0",
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.6,
  textAlign: "center",
};
