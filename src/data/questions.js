import { VOCA_WORDS } from "./vocaWords";
import { shuffleArray } from "../utils/shuffle";

export const TESTS = [
  { id: "vocab", title: "Voca Test", total: 60 },
  { id: "writing", title: "Writing Test", total: 10 },
  { id: "grammar", title: "Grammar Test", total: 10 },
  { id: "reading", title: "Reading Test", total: 10 },
];

function buildVocabQuestions() {
  const meaning = VOCA_WORDS.map((item, index) => ({
    id: `vm${index + 1}`,
    type: "meaning",
    sectionLabel: index === 0 ? "Part 1. 뜻 맞추기 (30문항)" : undefined,
    prompt: item.word,
    answer: item.meaning,
  }));

  const spelling = VOCA_WORDS.map((item, index) => ({
    id: `vs${index + 1}`,
    type: "spelling",
    sectionLabel: index === 0 ? "Part 2. 철자 쓰기 (30문항)" : undefined,
    prompt: item.meaning,
    answer: item.word,
  }));

  return [...meaning, ...spelling];
}

const WRITING_SENTENCES = [
  { id: "w1", prompt: "나는 매일 학교에 간다.", answer: "I go to school every day." },
  { id: "w2", prompt: "그녀는 사과를 좋아한다.", answer: "She likes apples." },
  { id: "w3", prompt: "나는 학생이다.", answer: "I am a student." },
  { id: "w4", prompt: "그들은 축구를 한다.", answer: "They play soccer." },
  { id: "w5", prompt: "이것은 책이다.", answer: "This is a book." },
  { id: "w6", prompt: "나는 물을 마신다.", answer: "I drink water." },
  { id: "w7", prompt: "그는 선생님이다.", answer: "He is a teacher." },
  { id: "w8", prompt: "우리는 행복하다.", answer: "We are happy." },
  { id: "w9", prompt: "고양이는 귀엽다.", answer: "The cat is cute." },
  { id: "w10", prompt: "나는 영어를 공부한다.", answer: "I study English." },
];

function buildWritingQuestions() {
  return WRITING_SENTENCES.map((item) => {
    const words = item.answer.replace(/[.!?]+$/, "").split(/\s+/);
    const shuffledWords = shuffleArray(
      words.map((word, index) => ({ key: `${item.id}-${index}`, word }))
    );

    return {
      id: item.id,
      type: "sentence",
      prompt: item.prompt,
      answer: item.answer,
      shuffledWords,
    };
  });
}

export function getQuestionsByTestId(testId) {
  switch (testId) {
    case "vocab":
      return buildVocabQuestions();

    case "writing":
      return buildWritingQuestions();

    case "grammar":
      return [
        {
          id: "g1",
          type: "mcq",
          prompt: "I ___ a student.",
          choices: ["am", "is", "are", "be"],
          answer: "am",
        },
        {
          id: "g2",
          type: "mcq",
          prompt: "She ___ to school every day.",
          choices: ["go", "goes", "going", "went"],
          answer: "goes",
        },
        {
          id: "g3",
          type: "mcq",
          prompt: "They ___ playing soccer now.",
          choices: ["is", "am", "are", "be"],
          answer: "are",
        },
        {
          id: "g4",
          type: "mcq",
          prompt: "I have ___ apple.",
          choices: ["a", "an", "the", "some"],
          answer: "an",
        },
        {
          id: "g5",
          type: "mcq",
          prompt: "He ___ not like milk.",
          choices: ["do", "does", "is", "are"],
          answer: "does",
        },
        {
          id: "g6",
          type: "mcq",
          prompt: "We ___ happy yesterday.",
          choices: ["is", "are", "was", "were"],
          answer: "were",
        },
        {
          id: "g7",
          type: "mcq",
          prompt: "This is ___ book.",
          choices: ["a", "an", "the", "are"],
          answer: "a",
        },
        {
          id: "g8",
          type: "short",
          prompt: "3인칭 단수 현재형 동사에 붙는 것은?",
          answer: "s",
        },
        { id: "g9", type: "short", prompt: "과거형 eat는?", answer: "ate" },
        { id: "g10", type: "short", prompt: "복수형 child는?", answer: "children" },
      ];

    case "reading":
      return [
        {
          id: "reading-main",
          type: "reading-fill",
          passage:
            "Tom is a ___(1) student. Every morning, he goes to ___(2). He likes ___(3) and drinks ___(4) at breakfast. His best ___(5) is Amy. They read a ___(6) together in class. Tom's ___(7) is kind and his ___(8) works in a hospital. After school, Tom runs in the ___(9) and feels very ___(10).",
          wordBank: [
            "good",
            "school",
            "bread",
            "milk",
            "friend",
            "book",
            "teacher",
            "father",
            "park",
            "happy",
            "sad",
            "hospital",
          ],
          blanks: [
            { id: "rf1", num: 1, answer: "good" },
            { id: "rf2", num: 2, answer: "school" },
            { id: "rf3", num: 3, answer: "bread" },
            { id: "rf4", num: 4, answer: "milk" },
            { id: "rf5", num: 5, answer: "friend" },
            { id: "rf6", num: 6, answer: "book" },
            { id: "rf7", num: 7, answer: "teacher" },
            { id: "rf8", num: 8, answer: "father" },
            { id: "rf9", num: 9, answer: "park" },
            { id: "rf10", num: 10, answer: "happy" },
          ],
        },
      ];

    default:
      return [];
  }
}
