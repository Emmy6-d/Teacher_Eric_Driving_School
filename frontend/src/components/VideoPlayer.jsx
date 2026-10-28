import { useLanguage } from "../i18n/LanguageContext";

export default function VideoPlayer({ video }) {
  const { t } = useLanguage();
  if (video.source_type === "youtube") {
    return <iframe className="learning-video-player" src={video.embed_url} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }
  return <video className="learning-video-player" controls preload="metadata" poster={video.thumbnail_url || undefined}>
    <source src={video.video_url} />
    <a href={video.video_url} target="_blank" rel="noreferrer">{t("videos.openVideo")}</a>
  </video>;
}
