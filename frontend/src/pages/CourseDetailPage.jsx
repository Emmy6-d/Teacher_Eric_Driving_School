import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import CourseImage from "../components/CourseImage";
import PageHeading from "../components/PageHeading";
import useCourses from "../hooks/useCourses";
import { useLanguage } from "../i18n/LanguageContext";
import { getVideos } from "../services/api";
import VideoPlayer from "../components/VideoPlayer";

export default function CourseDetailPage() {
  const { id } = useParams();
  const { courses, loading, error } = useCourses();
  const { t, language, courseName, courseDescription, courseObjectives } = useLanguage();
  const course = courses.find((item) => String(item.id) === id);
  const [videos, setVideos] = useState([]);
  useEffect(() => { if (course) getVideos(course.id).then(setVideos).catch(() => setVideos([])); }, [course]);
  return <main className="content-page">{loading && <p className="state-message" role="status">{t("common.loadingCourse")}</p>}{error && <p className="page-error" role="alert">{language === "en" ? error : t("common.loadError")}</p>}
    {!loading && !error && !course && <section className="not-found-panel"><span className="eyebrow">{t("course.invalidEyebrow")}</span><h1>{t("course.invalidTitle")}</h1><p>{t("course.invalidText")}</p><Link className="button button-primary" to="/courses">{t("course.browse")}</Link></section>}
    {!loading && !error && course && <><PageHeading eyebrow={t("course.detailEyebrow")} title={courseName(course)}>{courseDescription(course)}</PageHeading><section className="course-detail-visual"><CourseImage course={course} className="course-detail-image" /></section><section className="section course-overview"><div><span className="eyebrow">{t("course.focus")}</span><h2>{t("courses.objectives")}</h2><ul className="objective-list">{courseObjectives(course).map((objective) => <li key={objective}>{objective}</li>)}</ul></div><aside className="course-callout"><h2>{t("course.interested")}</h2><p>{t("course.followup")}</p><Link className="button button-primary" to={`/enroll?course=${course.id}`}>{t("courses.ask")}</Link></aside></section>{videos.length > 0 && <section className="section course-videos" id="learning-videos"><div className="section-heading"><span className="eyebrow">{t("videos.eyebrow")}</span><h2>{t("videos.heading")}</h2></div><div className="video-grid">{videos.map((video) => <article className="video-card" key={video.id}><VideoPlayer video={video} /><div className="video-card-copy"><h3>{video.title}</h3>{video.description && <p>{video.description}</p>}</div></article>)}</div></section>}</>}
  </main>;
}
