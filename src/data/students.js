// 학생 계정 — id / password 를 여기서 관리합니다
export const STUDENTS = [
  { id: "amy01", password: "1234", name: "Amy" },
  { id: "amy02", password: "1234", name: "Kate" },
  { id: "amy03", password: "1234", name: "Tom" },
  { id: "amy04", password: "1234", name: "Lucy" },
];

export function findStudent(id, password) {
  const trimmedId = (id ?? "").trim();
  const trimmedPassword = (password ?? "").trim();
  return STUDENTS.find(
    (s) => s.id === trimmedId && s.password === trimmedPassword
  );
}
