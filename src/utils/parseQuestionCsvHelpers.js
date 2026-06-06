import { SUBJECT_OPTIONS } from "./questionBankStorage";

const SUBJECT_ALIASES = {
  voca: "vocab",
  vocab: "vocab",
  vocabulary: "vocab",
  writing: "writing",
  grammar: "grammar",
  reading: "reading",
  단어: "vocab",
  작문: "writing",
  문법: "grammar",
  독해: "reading",
};

export function resolveSubject(raw) {
  const value = String(raw ?? "vocab").trim();
  if (!value) return "vocab";

  const alias = SUBJECT_ALIASES[value.toLowerCase()];
  if (alias) return alias;

  const matched = SUBJECT_OPTIONS.find(
    (option) =>
      option.id.toLowerCase() === value.toLowerCase() ||
      option.label.toLowerCase() === value.toLowerCase()
  );
  return matched?.id ?? "vocab";
}
