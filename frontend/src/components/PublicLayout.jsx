import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "../App.css";
import { LanguageSwitcher, useLanguage } from "../i18n/LanguageContext";
import Logo from "./Logo";

const links = [
  ["nav.home", "/"],
  ["nav.about", "/about"],
  ["nav.courses", "/courses"],
  ["nav.faq", "/faq"],
  ["nav.contact", "/contact"],
];

export default function PublicLayout() {
  const { t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    const key = path === "/" ? "home.title1" : path.startsWith("/about") ? "about.title" : path.startsWith("/courses") ? "courses.title" : path.startsWith("/enroll") ? "enroll.title" : path.startsWith("/contact") ? "contact.title" : path.startsWith("/faq") ? "faq.title" : path.startsWith("/videos") ? "videos.title" : "404.title";
    const title = `${t(key)} | Teacher Eric Driving School`;
    document.title = title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("seo.description"));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
  }, [location.pathname, t]);
  return (
    <div className="site-wrapper">
      <header className="navbar">
        <Link className="brand" to="/" aria-label={`Teacher Eric Driving School — ${t("nav.home").toLowerCase()}`}>
          <Logo className="brand-logo" />
          <span className="brand-text">Teacher Eric<small>{t("brand.school")}</small></span>
        </Link>
        <button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" aria-label={menuOpen ? t("nav.close") : t("nav.menu")} onClick={() => setMenuOpen((open) => !open)}>
          <span aria-hidden="true" /> <span aria-hidden="true" /> <span aria-hidden="true" />
        </button>
        <nav className={`navigation${menuOpen ? " is-open" : ""}`} id="primary-navigation" aria-label={t("nav.menu")}>
          {links.map(([key, path]) => (
            <NavLink key={path} to={path} end={path === "/"} onClick={() => setMenuOpen(false)}>{t(key)}</NavLink>
          ))}
        </nav>
        <div className="navbar-actions"><LanguageSwitcher /><Link className="nav-button" to="/enroll">{t("nav.enroll")}</Link></div>
      </header>
      <Outlet />
      <footer className="footer">
        <Link className="brand" to="/">
          <Logo className="footer-logo" alt="" />
          <span className="brand-text">Teacher Eric<small>{t("brand.school")}</small></span>
        </Link>
        <p>© {new Date().getFullYear()} Teacher Eric Driving School. {t("footer.rights")}</p>
      </footer>
    </div>
  );
}
