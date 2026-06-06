import { getQuestionsByTestId } from "../data/questions";
import { flattenQuestions } from "./grade";
import { loadReadingQuestions } from "./questionBankStorage";

function mapBankQuestion(question) {
  if (question.type === "objective") {
    return {
      id: question.id,
      type: "objective",
      prompt: question.prompt,
      answer: question.answer,
      options: question.options ?? [],
    };
  }
  return {
    id: question.id,
    type: "subjective",
    prompt: question.prompt,
    answer: question.answer,
  };
}

function buildFromQuestionBank() {
  const readingItems = loadReadingQuestions().filter((item) => item.passage?.trim());
  if (readingItems.length === 0) return null;

  const groups = new Map();
  readingItems.forEach((item) => {
    const passageId = item.passageId || item.passage;
    if (!groups.has(passageId)) {
      groups.set(passageId, {
        passageId,
        passage: item.passage,
        questions: [],
      });
    }
    groups.get(passageId).questions.push(mapBankQuestion(item));
  });

  const firstGroup = [...groups.values()][0];
  return firstGroup;
}

function buildFromBuiltinReading() {
  const baseQuestions = getQuestionsByTestId("reading");
  const readingMain = baseQuestions.find((item) => item.type === "reading-fill");
  if (!readingMain) return null;

  const flatQuestions = flattenQuestions(baseQuestions);
  return {
    passageId: readingMain.id,
    passage: readingMain.passage,
    wordBank: readingMain.wordBank,
    questions: flatQuestions.map((question) => ({
      id: question.id,
      type: "fill",
      prompt: question.prompt,
      answer: question.answer,
      num: question.num,
      wordBank: question.wordBank,
    })),
  };
}

export function getReadingTestSet() {
  return buildFromQuestionBank() ?? buildFromBuiltinReading();
}
