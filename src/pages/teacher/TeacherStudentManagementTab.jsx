import { useMemo, useState } from "react";
import { upsertStudentUser } from "../../services/studentsApi";
import {
  addStudent,
  deleteStudent,
  EMPTY_STUDENT_FORM,
  loadStudents,
  updateStudent,
} from "../../utils/studentStorage";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  inputStyle,
  sectionTitle,
  summaryCard,
  tableStyle,
  thTdStyle,
} from "./teacherStyles";

import { LEVEL_OPTIONS, formatLevelLabel, isActiveLevel } from "../../utils/levels";

export default function TeacherStudentManagementTab({ onStudentsChange }) {
  const [students, setStudents] = useState(() => loadStudents());
  const [form, setForm] = useState(EMPTY_STUDENT_FORM);
  const [editingUid, setEditingUid] = useState(null);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const syncStudents = (next, { changedStudent = null, skipFirebase = false } = {}) => {
    setStudents(next);
    onStudentsChange?.(next);

    if (!skipFirebase && changedStudent) {
      void upsertStudentUser(changedStudent);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => {
      const haystack = [
        student.name,
        student.school,
        student.grade,
        student.level,
        student.id,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [students, searchQuery]);

  const resetForm = () => {
    setForm(EMPTY_STUDENT_FORM);
    setEditingUid(null);
    setFormError("");
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = [
      ["level", "레벨"],
      ["name", "이름"],
      ["school", "학교"],
      ["grade", "학년"],
      ["id", "아이디"],
      ["password", "패스워드"],
    ];

    for (const [field, label] of required) {
      if (!String(form[field] ?? "").trim()) {
        return field === "level" ? "레벨을 선택해 주세요." : `${label}을(를) 입력해 주세요.`;
      }
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        school: form.school.trim(),
        grade: form.grade.trim(),
        level: form.level.trim(),
        id: form.id.trim(),
        password: form.password.trim(),
      };

      const next = editingUid
        ? updateStudent(editingUid, payload)
        : addStudent(payload);
      const savedStudent = editingUid
        ? next.find((student) => student.uid === editingUid)
        : next[0];
      syncStudents(next, { changedStudent: savedStudent });
      resetForm();
    } catch (error) {
      setFormError(error.message || "학생 정보를 저장하지 못했습니다.");
    }
  };

  const handleEdit = (student) => {
    setEditingUid(student.uid);
    setForm({
      name: student.name,
      school: student.school,
      grade: student.grade,
      level: student.level,
      id: student.id,
      password: student.password,
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (student) => {
    if (!confirm(`${student.name} (${student.id}) 학생 계정을 삭제할까요?`)) return;
    syncStudents(deleteStudent(student.uid), { skipFirebase: true });
    if (editingUid === student.uid) resetForm();
  };

  return (
    <div style={pageWrapStyle}>
      <section style={summaryCard}>
        <div style={headerRowStyle}>
          <div>
            <h2 style={sectionTitle}>{editingUid ? "학생 정보 수정" : "신규 학생 등록"}</h2>
            <p style={descStyle}>
              등록된 아이디·패스워드는 학생 로그인 화면에서 바로 사용됩니다.
            </p>
          </div>
          {editingUid && (
            <button type="button" onClick={resetForm} style={btnSecondary}>
              등록 모드로 전환
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={formGridStyle}>
            <LevelSelect value={form.level} onChange={(v) => handleFieldChange("level", v)} />
            <Field label="이름" value={form.name} onChange={(v) => handleFieldChange("name", v)} placeholder="예: 홍길동" />
            <Field label="학교" value={form.school} onChange={(v) => handleFieldChange("school", v)} placeholder="예: Amy Elementary" />
            <Field label="학년" value={form.grade} onChange={(v) => handleFieldChange("grade", v)} placeholder="예: 5학년" />
            <Field label="아이디" value={form.id} onChange={(v) => handleFieldChange("id", v)} placeholder="예: amy05" />
            <Field label="패스워드" value={form.password} onChange={(v) => handleFieldChange("password", v)} placeholder="예: 1234" />
          </div>

          {formError && <p style={errorStyle}>{formError}</p>}

          <button type="submit" style={{ ...btnPrimary, marginTop: 16 }}>
            {editingUid ? "수정 완료" : "학생 등록"}
          </button>
        </form>
      </section>

      <section style={summaryCard}>
        <div style={listHeaderStyle}>
          <div>
            <h2 style={sectionTitle}>학생 목록</h2>
            <p style={descStyle}>총 {students.length}명 · 표시 {filteredStudents.length}명</p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 학교, 레벨, 아이디 검색..."
            style={searchStyle}
          />
        </div>

        {filteredStudents.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>
              {students.length === 0 ? "등록된 학생이 없습니다." : "검색 결과가 없습니다."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>레벨</th>
                  <th style={thStyle}>이름</th>
                  <th style={thStyle}>학교</th>
                  <th style={thStyle}>학년</th>
                  <th style={thStyle}>아이디</th>
                  <th style={thStyle}>패스워드</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.uid} style={rowStyle}>
                    <td style={tdStyle}>
                      <span style={levelBadgeStyle}>{formatLevelLabel(student.level)}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{student.name}</td>
                    <td style={tdStyle}>{student.school}</td>
                    <td style={tdStyle}>{student.grade}</td>
                    <td style={tdStyle}>
                      <code style={codeStyle}>{student.id}</code>
                    </td>
                    <td style={tdStyle}>{student.password}</td>
                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button type="button" onClick={() => handleEdit(student)} style={editBtnStyle}>
                          수정
                        </button>
                        <button type="button" onClick={() => handleDelete(student)} style={btnDanger}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={compactLabelStyle}>
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, marginTop: 6 }}
      />
    </label>
  );
}

function LevelSelect({ value, onChange }) {
  const isLegacyLevel = value && !isActiveLevel(value);

  return (
    <label style={compactLabelStyle}>
      레벨
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">레벨 선택</option>
        {isLegacyLevel && (
          <option value={value}>
            {value} (기존)
          </option>
        )}
        {LEVEL_OPTIONS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </label>
  );
}

const selectStyle = {
  ...inputStyle,
  marginTop: 6,
  cursor: "pointer",
};

const pageWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 4,
};

const descStyle = {
  margin: "6px 0 0",
  fontSize: 14,
  color: "#94a3b8",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const compactLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
};

const errorStyle = {
  color: "#dc2626",
  margin: "12px 0 0",
  fontSize: 14,
  fontWeight: 600,
};

const listHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 16,
  flexWrap: "wrap",
};

const searchStyle = {
  width: "min(300px, 100%)",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  background: "#fafbfc",
  boxSizing: "border-box",
};

const emptyStateStyle = {
  textAlign: "center",
  padding: "40px 20px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px dashed #e2e8f0",
};

const thStyle = {
  ...thTdStyle,
  background: "#f8fafc",
  fontSize: 13,
  fontWeight: 800,
  color: "#64748b",
};

const tdStyle = {
  ...thTdStyle,
  fontSize: 14,
  verticalAlign: "middle",
  padding: "16px 14px",
};

const rowStyle = {
  transition: "background 0.15s ease",
};

const levelBadgeStyle = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#4338ca",
  fontSize: 12,
  fontWeight: 700,
};

const codeStyle = {
  padding: "2px 8px",
  borderRadius: 6,
  background: "#f1f5f9",
  color: "#0f172a",
  fontSize: 13,
};

const actionRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const editBtnStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  background: "white",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
};
