import InquiryForm from "../components/InquiryForm";
import PageHeading from "../components/PageHeading";
import useCourses from "../hooks/useCourses";
import { useLanguage } from "../i18n/LanguageContext";

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.1 3.8 9.5 3l2.1 4.7-2 1.5a14.7 14.7 0 0 0 5.2 5.2l1.5-2 4.7 2.1-.8 2.4a3 3 0 0 1-3.2 2.1A16.7 16.7 0 0 1 5 6.9a3 3 0 0 1 2.1-3.1Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="15" fill="#25D366" /><path d="M8.1 23.9 6.9 28l4.3-1.3A12 12 0 1 0 8.1 23.9Z" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><path d="M12.1 10.7c-.4-.9-.8-.9-1.2-.9h-.9c-.3 0-.8.1-1.2.6-.4.4-1.5 1.4-1.5 3.4s1.5 3.9 1.7 4.1c.2.3 2.9 4.6 7.1 6.2 3.5 1.4 4.2 1.1 5 .9.8-.1 2.4-1 2.8-1.9.3-.9.3-1.7.2-1.9-.1-.2-.4-.3-.9-.6-.5-.2-2.4-1.2-2.8-1.3-.4-.2-.7-.2-1 .3-.3.5-1.1 1.3-1.3 1.6-.2.3-.5.3-.9.1-.5-.2-1.8-.7-3.4-2.1-1.2-1.1-2.1-2.4-2.3-2.9-.2-.5 0-.7.2-.9l.6-.7c.2-.2.3-.5.5-.8.1-.3 0-.6 0-.8l-1-2.4Z" fill="#fff" transform="translate(2 1) scale(.82)" /></svg>;
}

function EmailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4.5" width="18" height="15" rx="2.2" fill="#fff" stroke="#EA4335" strokeWidth="1.8" /><path d="m4.2 6 7.8 6.2L19.8 6" fill="none" stroke="#EA4335" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><path d="M4.2 18.2v-7.5m15.6 7.5v-7.5" fill="none" stroke="#4285F4" strokeLinecap="round" strokeWidth="1.6" /></svg>;
}

export default function ContactPage() {
  const { courses, loading, error } = useCourses();
  const { t, language } = useLanguage();
  const methods = [
    { label: t("contact.phoneLabel"), value: "+250783393851", href: "tel:+250783393851", type: "phone", Icon: PhoneIcon },
    { label: t("contact.whatsappLabel"), value: "+250783393851", href: "https://wa.me/250783393851", type: "whatsapp", Icon: WhatsAppIcon, external: true },
    { label: t("contact.emailLabel"), value: "ericteacher33@gmail.com", href: "mailto:ericteacher33@gmail.com", type: "email", Icon: EmailIcon },
  ];

  return <main className="content-page">
    <PageHeading eyebrow={t("contact.eyebrow")} title={t("contact.title")}>{t("contact.intro")}</PageHeading>
    <section className="section contact-page-grid">
      <div className="contact-information">
        <span className="eyebrow">{t("contact.methodsLabel")}</span>
        <h2>{t("contact.methodsHeading")}</h2>
        <p>{t("contact.methodsIntro")}</p>
        <div className="contact-methods" aria-label={t("contact.methodsLabel")}>
          {methods.map(({ label, value, href, type, Icon, external }) => <a className={`contact-method-link contact-method-${type}`} href={href} key={type} aria-label={`${label}: ${value}`} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <span className="contact-method-icon"><Icon /></span>
            <span className="contact-method-copy"><span>{label}</span><strong>{value}</strong></span>
          </a>)}
        </div>
        <div className="contact-note"><span>01</span><p>{t("contact.selectCourse")}</p></div>
        <div className="contact-note"><span>02</span><p>{t("contact.addQuestion")}</p></div>
      </div>
      <div>
        {loading && <p role="status">{t("common.loadingCourses")}</p>}
        {error && <p className="page-error" role="alert">{language === "en" ? error : t("common.loadError")}</p>}
        {!loading && !error && courses.length > 0 && <InquiryForm courses={courses} intro={t("contact.formNote")} />}
      </div>
    </section>
  </main>;
}
