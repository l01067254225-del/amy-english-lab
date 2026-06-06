import { getSubjectLabel } from "./questionBankStorage";
import { sortReadingQuestions } from "./readingQuestionOrder";
import { drawQuestionsFromPool } from "./examSetStorage";
import { buildVocaExamQuestions } from "./vocaExamBuilder";
import { ensureArray } from "./safeData";

export function resolveExamSubject(exam) {
  if (!exam) return "";
  return (
    exam.setSource?.subject ??
    exam.materialSource?.subject ??
    (exam.vocaSource ? "vocab" : "")
  );
}

export function buildExamPayloadFromSelection({
  examTitle,
  targetLevel,
  testDate,
  filterSubject,
  selectedSetNames,
  selectedSetsData,
  drawCount,
  vocaExamType = "meaning",
}) {
  if (!examTitle?.trim()) {
    return { ok: false, error: "시험지 제목을 입력해 주세요." };
  }
  if (!targetLevel) {
    return { ok: false, error: "대상 레벨을 선택해 주세요." };
  }
  if (!filterSubject) {
    return { ok: false, error: "과목을 선택해 주세요." };
  }
  if (!testDate) {
    return { ok: false, error: "시험 날짜를 선택해 주세요." };
  }
  if (ensureArray(selectedSetsData).length === 0) {
    return { ok: false, error: "시험 자료명을 하나 이상 선택해 주세요." };
  }

  const requestedCount = Number(drawCount);
  if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
    return { ok: false, error: "출제 문항 수를 1 이상 입력해 주세요." };
  }

  const isVocabMode = filterSubject === "vocab";

  if (isVocabMode) {
    const words = selectedSetsData.flatMap((entry) => entry.words ?? []);
    if (words.length === 0) {
      return { ok: false, error: "선택한 자료에 등록된 단어가 없습니다." };
    }
    if (requestedCount > words.length) {
      return {
        ok: false,
        error: `출제 문항 수는 선택한 자료 단어 수(${words.length}개)를 넘을 수 없습니다.`,
      };
    }

    const generated = buildVocaExamQuestions(words, {
      examType: vocaExamType,
      drawCount: requestedCount,
    }).map((question) => ({ ...question, level: targetLevel }));

    if (generated.length === 0) {
      return { ok: false, error: "시험 문항을 생성하지 못했습니다." };
    }

    return {
      ok: true,
      data: {
        title: examTitle.trim(),
        questions: generated,
        targetLevel,
        testDate,
        setSource: {
          setNames: selectedSetNames,
          subject: filterSubject,
          drawCount: requestedCount,
          examType: vocaExamType,
        },
        vocaSource: {
          setIds: selectedSetsData.flatMap((entry) => entry.setIds ?? []),
          examType: vocaExamType,
          drawCount: requestedCount,
        },
      },
    };
  }

  const isReadingExam = filterSubject === "reading";
  const questionPool = isReadingExam
    ? selectedSetsData.flatMap((entry) =>
        sortReadingQuestions(entry.questions ?? [])
      )
    : selectedSetsData.flatMap((entry) => entry.questions ?? []);
  if (questionPool.length === 0) {
    return { ok: false, error: "선택한 자료에 포함된 문제가 없습니다." };
  }
  if (requestedCount > questionPool.length) {
    return {
      ok: false,
      error: `출제 문항 수는 선택한 자료의 문항 수(${questionPool.length}개)를 넘을 수 없습니다.`,
    };
  }

  const selectedQuestions = drawQuestionsFromPool(questionPool, requestedCount, {
    subject: filterSubject,
  });

  return {
    ok: true,
    data: {
      title: examTitle.trim(),
      questions: selectedQuestions,
      targetLevel,
      testDate,
      setSource: {
        setNames: selectedSetNames,
        subject: filterSubject,
        drawCount: requestedCount,
      },
      materialSource: {
        materialSetIds: selectedSetsData.flatMap((entry) => entry.setIds ?? []),
        subject: filterSubject,
        drawCount: requestedCount,
      },
    },
  };
}

export function getExamSubjectLabel(subjectId) {
  return getSubjectLabel(subjectId);
}
