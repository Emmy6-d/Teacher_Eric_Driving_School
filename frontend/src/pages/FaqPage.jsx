import PageHeading from "../components/PageHeading";
import { useLanguage } from "../i18n/LanguageContext";

export default function FaqPage() {
  const { t } = useLanguage();
  return <main className="content-page"><PageHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")}>{t("faq.intro")}</PageHeading><section className="section faq-list" aria-label={t("faq.title")}>
    {Array.from({ length: 7 }, (_, i) => i + 1).map((i) => <details className="faq-item" key={i}><summary>{t(`faq.q${i}`)}<span aria-hidden="true">+</span></summary><p>{t(`faq.a${i}`)}</p></details>)}
  </section></main>;
}
