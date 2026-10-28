import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

export default function NotFoundPage() {
  const { t } = useLanguage();
  return <main className="not-found-panel"><span className="eyebrow">{t("404.eyebrow")}</span><h1>{t("404.title")}</h1><p>{t("404.text")}</p><Link className="button button-primary" to="/">{t("404.home")}</Link></main>;
}
