import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeading from "../components/PageHeading";
import VideoPlayer from "../components/VideoPlayer";
import { getVideos } from "../services/api";
import useCourses from "../hooks/useCourses";
import { useLanguage } from "../i18n/LanguageContext";

export default function VideosPage() {
  const { courses } = useCourses();
  const { t, apiError, courseName } = useLanguage();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { getVideos().then(setVideos).catch((cause) => setError(apiError(cause.message))).finally(() => setLoading(false)); }, [apiError]);
  return <main className="content-page"><PageHeading eyebrow={t("videos.eyebrow")} title={t("videos.title")}>{t("videos.intro")}</PageHeading>
    <section className="section videos-page"><div className="section-heading"><span className="eyebrow">{t("videos.eyebrow")}</span><h2>{t("videos.heading")}</h2></div>
      {loading && <p role="status">{t("videos.loading")}</p>}{error && <p className="page-error" role="alert">{error}</p>}
      {!loading && !error && videos.length === 0 && <p className="empty-video-state">{t("videos.empty")}</p>}
      {!loading && !error && videos.length > 0 && <div className="video-grid">{videos.map((video) => { const course = courses.find((item) => item.id === video.course_id); return <article className="video-card" key={video.id}><VideoPlayer video={video} /><div className="video-card-copy"><span className="eyebrow">{course ? courseName(course) : t("videos.course")}</span><h3>{video.title}</h3>{video.description && <p>{video.description}</p>}<Link className="text-link" to={`/courses/${video.course_id}#learning-videos`}>{t("videos.viewCourse")} →</Link></div></article>; })}</div>}
    </section>
  </main>;
}
