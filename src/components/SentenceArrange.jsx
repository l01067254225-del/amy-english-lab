export default function SentenceArrange({
  question,
  userAnswer,
  submitted,
  onAnswer,
}) {
  const selectedKeys = userAnswer ? userAnswer.split("||") : [];
  const selectedSet = new Set(selectedKeys);

  const selectedWords = selectedKeys
    .map((key) => question.shuffledWords.find((item) => item.key === key)?.word)
    .filter(Boolean);

  const updateKeys = (keys) => {
    onAnswer(question.id, keys.join("||"));
  };

  const addWord = (key) => {
    if (submitted || selectedSet.has(key)) return;
    updateKeys([...selectedKeys, key]);
  };

  const removeLast = () => {
    if (submitted || selectedKeys.length === 0) return;
    updateKeys(selectedKeys.slice(0, -1));
  };

  const clearAll = () => {
    if (submitted) return;
    onAnswer(question.id, "");
  };

  const chipStyle = {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: submitted ? "default" : "pointer",
    fontSize: 15,
    fontWeight: 600,
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          minHeight: 48,
          padding: 12,
          borderRadius: 8,
          border: "2px dashed #cbd5e1",
          background: "#f8fafc",
          lineHeight: 1.6,
          color: selectedWords.length ? "#0f172a" : "#94a3b8",
        }}
      >
        {selectedWords.length
          ? selectedWords.join(" ")
          : "단어를 눌러 문장을 만드세요"}
      </div>

      {!submitted && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={removeLast} style={smallBtnStyle}>
            한 단어 취소
          </button>
          <button type="button" onClick={clearAll} style={smallBtnStyle}>
            전체 지우기
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {question.shuffledWords.map((item) => {
          const used = selectedSet.has(item.key);
          return (
            <button
              key={item.key}
              type="button"
              disabled={submitted || used}
              onClick={() => addWord(item.key)}
              style={{
                ...chipStyle,
                opacity: used ? 0.35 : 1,
                background: used ? "#e2e8f0" : "white",
              }}
            >
              {item.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const smallBtnStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: 13,
};
