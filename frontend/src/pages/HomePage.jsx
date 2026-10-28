import { Link } from "react-router-dom";
import useCourses from "../hooks/useCourses";
import { useLanguage } from "../i18n/LanguageContext";
import { getVideos } from "../services/api";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { courses, loading, error } = useCourses();
  const { t, language, courseName, courseDescription } = useLanguage();
  const [publishedVideos, setPublishedVideos] = useState([]);
  useEffect(() => { getVideos().then(setPublishedVideos).catch(() => setPublishedVideos([])); }, []);
  return <main>
    <section className="hero"><div className="hero-copy"><span className="eyebrow">{t("home.eyebrow")}</span><h1>{t("home.title1")}<br /><span>{t("home.title2")}</span></h1><p>{t("home.intro")}</p><div className="hero-buttons"><Link className="button button-primary" to="/enroll">{t("home.start")} →</Link><Link className="button button-outline" to="/courses">{t("home.explore")}</Link></div></div>
      <div className="hero-image"><img src="/images/Home_Page_Image.jpg" alt={t("home.imageAlt")} fetchPriority="high" decoding="async" /><div className="image-caption"><span className="caption-icon" aria-hidden="true">✓</span><div><strong>{t("home.caption")}</strong><p>{t("home.captionNote")}</p></div></div></div>
    </section>
    <section className="section"><div className="section-heading"><span className="eyebrow">{t("home.training")}</span><h2>{t("home.choose")}</h2><p>{t("home.courseIntro")}</p></div>
      {loading && <p role="status">{t("common.loadingCourses")}</p>}{error && <p className="page-error" role="alert">{language === "en" ? error : t("common.loadError")} {t("common.retry")}</p>}
      {!loading && !error && <div className="course-grid">{courses.map((course, i) => <article className="course-card" key={course.id}><span className="course-index">{String(i + 1).padStart(2, "0")}</span><h3>{courseName(course)}</h3><p>{courseDescription(course)}</p><Link to={`/courses/${course.id}`}>{t("home.viewDetails")} →</Link></article>)}</div>}
      <p className="section-action"><Link className="text-link" to="/courses">{t("home.allCourses")} →</Link></p>
      {publishedVideos.length > 0 && <aside className="home-video-links"><span className="eyebrow">{t("videos.eyebrow")}</span><h2>{t("videos.homeHeading")}</h2><div>{[...new Map(publishedVideos.map((video) => [video.course_id, video])).values()].map((video) => { const course = courses.find((item) => item.id === video.course_id); return course ? <Link className="text-link" key={video.course_id} to={`/courses/${course.id}#learning-videos`}>{t("videos.viewCourseVideos", { course: courseName(course) })} →</Link> : null; })}</div></aside>}
    </section>
    <section className="benefits-section section"><div className="section-heading"><span className="eyebrow">{t("home.begin")}</span><h2>{t("home.skills")}</h2><p>{t("home.skillsIntro")}</p></div><div className="benefit-grid"><article><span>01</span><h3>{t("home.road")}</h3><p>{t("home.roadText")}</p></article><article><span>02</span><h3>{t("home.practice")}</h3><p>{t("home.practiceText")}</p></article><article><span>03</span><h3>{t("home.improve")}</h3><p>{t("home.improveText")}</p></article></div></section>
    <section className="process-section section"><div><span className="eyebrow">{t("home.steps")}</span><h2>{t("home.threeSteps")}</h2></div><ol className="process-list"><li><strong>{t("home.stepExplore")}</strong><span>{t("home.stepExploreText")}</span></li><li><strong>{t("home.stepAsk")}</strong><span>{t("home.stepAskText")}</span></li><li><strong>{t("home.stepDiscuss")}</strong><span>{t("home.stepDiscussText")}</span></li></ol></section>
    <section className="contact-banner"><div><span className="eyebrow">{t("home.ready")}</span><h2>{t("home.nextStep")}</h2><p>{t("home.askTraining")}</p></div><Link className="button button-light" to="/contact">{t("home.contactSchool")} →</Link></section>
  </main>;
}


