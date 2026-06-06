export function parseWritingBlock(block) {
  const lines = String(block ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const prompt = lines[0];
  const givenWords = lines[1];
  const answer = lines.slice(2).join(" ");

  if (!prompt || !givenWords || !answer) return null;

  return {
    subject: "writing",
    type: "writing",
    prompt,
    givenWords,
    answer,
  };
}

export function parseWritingEntries(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return { entries: [], errors: [] };

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const entries = [];
  const errors = [];

  const candidates =
    blocks.length > 1
      ? blocks
      : (() => {
          const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
          const grouped = [];
          for (let index = 0; index + 2 < lines.length; index += 3) {
            grouped.push(lines.slice(index, index + 3).join("\n"));
          }
          return grouped.length > 0 ? grouped : [normalized];
        })();

  candidates.forEach((block, index) => {
    const parsed = parseWritingBlock(block);
    if (!parsed) {
      errors.push(`${index + 1}번째 영작: 본문·주어진 단어·정답 3줄 형식을 인식하지 못했습니다.`);
      return;
    }
    entries.push(parsed);
  });

  return { entries, errors };
}

export function getWritingPasteExample() {
  return `나는 매일 학교에 간다.
I, go, school, every day
I go to school every day.

그는 어제 도서관에서 책을 읽었다.
He, read, book, library, yesterday
He read a book at the library yesterday.`;
}

export function getWritingPasteHint() {
  return "Writing: 문항마다 [문제 본문 / 주어진 단어 / 모범 답안] 3줄씩 입력하세요. 빈 줄로 문항을 구분할 수 있습니다.";
}
