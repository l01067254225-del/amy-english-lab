export const STUDENTS_STORAGE_KEY = "amy-students-list";

export const DEFAULT_STUDENTS = [
  {
    uid: "seed-amy01",
    id: "amy01",
    password: "1234",
    name: "Amy",
    className: "A반",
    school: "Amy Elementary",
    grade: "5학년",
    level: "Intermediate",
  },
  {
    uid: "seed-amy02",
    id: "amy02",
    password: "1234",
    name: "Kate",
    className: "A반",
    school: "Amy Elementary",
    grade: "5학년",
    level: "Intermediate",
  },
  {
    uid: "seed-amy03",
    id: "amy03",
    password: "1234",
    name: "Tom",
    className: "B반",
    school: "Amy Elementary",
    grade: "6학년",
    level: "Advanced",
  },
  {
    uid: "seed-amy04",
    id: "amy04",
    password: "1234",
    name: "Lucy",
    className: "B반",
    school: "Amy Elementary",
    grade: "6학년",
    level: "Advanced",
  },
];

function createUid() {
  return `stu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStudent(raw) {
  return {
    uid: raw.uid || createUid(),
    id: String(raw.id ?? "").trim(),
    password: String(raw.password ?? "").trim(),
    name: String(raw.name ?? "").trim(),
    className: String(raw.className ?? raw.class ?? "").trim(),
    school: String(raw.school ?? "").trim(),
    grade: String(raw.grade ?? "").trim(),
    level: String(raw.level ?? "").trim(),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

function readStudentsRaw() {
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStudents(students) {
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
}

export function loadStudents() {
  const stored = readStudentsRaw();
  if (stored && stored.length > 0) {
    const normalized = stored.map(normalizeStudent);
    if (stored.some((item) => !item.uid)) {
      writeStudents(normalized);
    }
    return normalized;
  }

  const seeded = DEFAULT_STUDENTS.map(normalizeStudent);
  writeStudents(seeded);
  return seeded;
}

export function saveStudents(students) {
  const normalized = students.map(normalizeStudent);
  writeStudents(normalized);
  return normalized;
}

export function findStudent(id, password) {
  const trimmedId = String(id ?? "").trim();
  const trimmedPassword = String(password ?? "").trim();
  return loadStudents().find(
    (student) => student.id === trimmedId && student.password === trimmedPassword
  );
}

export function findStudentByLoginId(id) {
  const trimmedId = String(id ?? "").trim();
  return loadStudents().find((student) => student.id === trimmedId) ?? null;
}

export function addStudent(input) {
  const students = loadStudents();
  const nextStudent = normalizeStudent({
    ...input,
    uid: createUid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (students.some((student) => student.id === nextStudent.id)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  const next = [nextStudent, ...students];
  return saveStudents(next);
}

export function updateStudent(uid, input) {
  const students = loadStudents();
  const index = students.findIndex((student) => student.uid === uid);
  if (index < 0) {
    throw new Error("학생 정보를 찾을 수 없습니다.");
  }

  const trimmedId = String(input.id ?? "").trim();
  if (students.some((student) => student.id === trimmedId && student.uid !== uid)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  const next = [...students];
  next[index] = normalizeStudent({
    ...students[index],
    ...input,
    uid,
    updatedAt: new Date().toISOString(),
  });
  return saveStudents(next);
}

export function deleteStudent(uid) {
  const next = loadStudents().filter((student) => student.uid !== uid);
  return saveStudents(next);
}

export const EMPTY_STUDENT_FORM = {
  className: "",
  name: "",
  school: "",
  grade: "",
  level: "",
  id: "",
  password: "",
};
