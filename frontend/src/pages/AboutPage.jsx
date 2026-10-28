import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading";
import { useLanguage } from "../i18n/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();
  const values = [["about.responsibility", "about.responsibilityText"], ["about.practice", "about.practiceText"], ["about.safety", "about.safetyText"]];
  return <main className="content-page">
    <section className="about-hero">
      <PageHeading eyebrow={t("about.eyebrow")} title={t("about.title")}>{t("about.intro")}</PageHeading>
      <div className="about-hero-image"><img src="/images/About(1).jpg" alt={t("about.imageAlt")} loading="lazy" decoding="async" /></div>
    </section>
    <section className="story-panel"><div><span className="eyebrow">{t("about.purpose")}</span><h2>{t("about.knowledge")}</h2></div><p>{t("about.story")}</p></section>
    <section className="section mission-grid"><article><span className="eyebrow">{t("about.missionLabel")}</span><h2>{t("about.mission")}</h2></article><article><span className="eyebrow">{t("about.visionLabel")}</span><h2>{t("about.vision")}</h2></article></section>
    <section className="section values-section"><div className="section-heading"><span className="eyebrow">{t("about.valuesLabel")}</span><h2>{t("about.values")}</h2></div><div className="benefit-grid">{values.map(([title, text], i) => <article key={title}><span>0{i + 1}</span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></section>
    <section className="section approach-section"><div><span className="eyebrow">{t("about.approachLabel")}</span><h2>{t("about.approach")}</h2></div><div><p>{t("about.approachText1")}</p><p>{t("about.approachText2")}</p><Link className="button button-primary" to="/courses">{t("home.explore")}</Link></div></section>
  </main>;
}
