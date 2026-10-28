import { useEffect, useState } from "react";
import { getCourses } from "../services/api";

export default function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCourses()
      .then((data) => { if (active) setCourses(data); })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { courses, loading, error };
}
