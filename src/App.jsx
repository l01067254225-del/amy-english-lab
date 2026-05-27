import { useEffect, useState } from "react";
import StudentGate from "./pages/StudentGate";
import TeacherApp from "./pages/TeacherApp";

function getPageFromHash() {
  return window.location.hash === "#teacher" ? "teacher" : "student";
}

export default function App() {
  const [page, setPage] = useState(getPageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (page === "teacher") {
    return <TeacherApp />;
  }

  return <StudentGate />;
}
