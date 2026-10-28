import { Link } from "react-router-dom";
import CourseImage from "../components/CourseImage";
import PageHeading from "../components/PageHeading";
import useCourses from "../hooks/useCourses";
import { useLanguage } from "../i18n/LanguageContext";

export default function CoursesPage() {
  const { courses, loading, error } = useCourses();
  const { t, language, courseName, courseDescription, courseObjectives } = useLanguage();
  return <main className="content-page">
    <PageHeading eyebrow={t("courses.eyebrow")} title={t("courses.title")}>{t("courses.intro")}</PageHeading>
    {loading && <p className="state-message" role="status">{t("common.loadingCourses")}</p>}
    {error && <p className="page-error" role="alert">{language === "en" ? error : t("common.loadError")}</p>}
    {!loading && !error && <section className="section course-list">
      {courses.map((course, index) => <article className="course-detail-card" key={course.id}>
        <CourseImage course={course} />
        <div className="course-detail-copy">
          <span className="course-card-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="eyebrow">{t("courses.option")}</span>
          <h2>{courseName(course)}</h2>
          <p>{courseDescription(course)}</p>
          <h3>{t("courses.objectives")}</h3>
          <ul>{courseObjectives(course).map((objective) => <li key={objective}>{objective}</li>)}</ul>
          <div className="course-card-actions">
            <Link className="button button-primary" to={`/courses/${course.id}`}>{t("courses.details")}</Link>
            <Link className="button button-outline" to={`/enroll?course=${course.id}`}>{t("courses.ask")}</Link>
          </div>
        </div>
      </article>)}
      {courses.length === 0 && <p>{t("courses.none")}</p>}
    </section>}
  </main>;
}
