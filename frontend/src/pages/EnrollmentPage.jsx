import { useSearchParams, Link } from "react-router-dom";
import InquiryForm from "../components/InquiryForm";
import PageHeading from "../components/PageHeading";
import useCourses from "../hooks/useCourses";
import { useLanguage } from "../i18n/LanguageContext";

export default function EnrollmentPage() {
  const { courses, loading, error } = useCourses();
  const [params] = useSearchParams();
  const { t, language } = useLanguage();
  const selected = courses.find((course) => String(course.id) === params.get("course"));
  return <main className="content-page"><PageHeading eyebrow={t("enroll.eyebrow")} title={t("enroll.title")}>{t("enroll.intro")}</PageHeading><section className="section enrollment-page-grid">
    <div className="enrollment-guidance"><span className="eyebrow">{t("enroll.next")}</span><h2>{t("enroll.conversation")}</h2><ol className="numbered-steps"><li><strong>{t("enroll.step1")}</strong><span>{t("enroll.step1Text")}</span></li><li><strong>{t("enroll.step2")}</strong><span>{t("enroll.step2Text")}</span></li><li><strong>{t("enroll.step3")}</strong><span>{t("enroll.step3Text")}</span></li></ol><p>{t("enroll.recordNote")}</p><Link className="text-link" to="/faq">{t("enroll.faq")} →</Link></div>
    <div>{loading && <p role="status">{t("common.loadingCourses")}</p>}{error && <p className="page-error" role="alert">{language === "en" ? error : t("common.loadError")}</p>}{!loading && !error && courses.length > 0 && <InquiryForm courses={courses} initialCourse={selected?.name || courses[0].name} />}</div>
  </section></main>;
}
