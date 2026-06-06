import { ensureArray } from "./safeData";

const VOCA_SETS_KEY = "amy-test-voca-sets";

function readJson() {
  try {
    const raw = localStorage.getItem(VOCA_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(data) {
  localStorage.setItem(VOCA_SETS_KEY, JSON.stringify(data));
}

export function createVocaSetId() {
  return `voca_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeWordEntry(entry) {
  const word = String(entry?.word ?? "").trim();
  const mean = String(entry?.mean ?? entry?.meaning ?? "").trim();
  return { word, mean };
}

export function normalizeVocaSet(set) {
  const setId = set.setId || createVocaSetId();
  const setName = String(set.setName ?? "").trim() || "이름 없는 Voca 세트";
  return {
    setId,
    setName,
    level: String(set.level ?? "").trim(),
    words: ensureArray(set.words)
      .map(normalizeWordEntry)
      .filter((entry) => entry.word && entry.mean),
    createdAt: set.createdAt || new Date().toISOString(),
    isAutoSet: Boolean(set.isAutoSet),
  };
}

export function loadVocaSets() {
  return ensureArray(readJson()).map(normalizeVocaSet);
}

import { suggestSetName } from "./examSetStorage";

export function suggestVocaSetName(level = "") {
  return suggestSetName("vocab", level);
}

export function addVocaSet({ setName, level, words }) {
  const normalizedWords = ensureArray(words)
    .map(normalizeWordEntry)
    .filter((entry) => entry.word && entry.mean);

  const item = normalizeVocaSet({
    setId: createVocaSetId(),
    setName: String(setName ?? "").trim() || suggestVocaSetName(level),
    level: String(level ?? "").trim(),
    words: normalizedWords,
    createdAt: new Date().toISOString(),
  });

  const next = [item, ...loadVocaSets()];
  writeJson(next);
  return next;
}

export function removeVocaSet(setId) {
  const next = loadVocaSets().filter((set) => set.setId !== setId);
  writeJson(next);
  return next;
}

export function updateVocaSet(setId, { setName, level, words }) {
  const targetId = String(setId ?? "").trim();
  const next = loadVocaSets().map((set) => {
    if (set.setId !== targetId) return set;
    return normalizeVocaSet({
      ...set,
      setName: String(setName ?? set.setName).trim() || set.setName,
      level: String(level ?? set.level ?? "").trim(),
      words: ensureArray(words),
    });
  });
  writeJson(next);
  return next;
}

export function filterVocaSetsByLevel(sets, targetLevel) {
  const list = ensureArray(sets);
  if (!targetLevel) return list;
  return list.filter((set) => set.level === targetLevel);
}

export function collectWordsFromVocaSets(sets, setIds) {
  const idSet = new Set(setIds);
  const words = [];

  ensureArray(sets)
    .filter((set) => idSet.has(set.setId))
    .forEach((set) => {
      words.push(...set.words);
    });

  return words;
}
