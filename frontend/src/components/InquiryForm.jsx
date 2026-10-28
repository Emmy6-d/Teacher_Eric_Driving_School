import { useRef, useState } from "react";
import { submitInquiry } from "../services/api";
import { useLanguage } from "../i18n/LanguageContext";

export default function InquiryForm({ courses, initialCourse = "", intro }) {
  const { t, apiError, courseName } = useLanguage();
  const [form, setForm] = useState({ full_name: "", phone: "", course: initialCourse, message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const inFlight = useRef(false);
  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!form.full_name.trim() || !form.phone.trim() || !form.course) return setNotice({ type: "error", text: t("form.required") });
    if (form.full_name.trim().length < 2) return setNotice({ type: "error", text: t("form.nameInvalid") });
    if (form.phone.replace(/\D/g, "").length < 9) return setNotice({ type: "error", text: t("form.phoneInvalid") });
    inFlight.current = true; setSubmitting(true); setNotice(null);
    try {
      await submitInquiry({ ...form, full_name: form.full_name.trim() });
      setNotice({ type: "success", text: t("form.success") });
      setForm({ full_name: "", phone: "", course: courses[0]?.name || "", message: "" });
    } catch (error) { setNotice({ type: "error", text: apiError(error.message, "form") }); }
    finally { inFlight.current = false; setSubmitting(false); }
  }
  return <form className="inquiry-form" onSubmit={submit} noValidate>
    <h2>{t("form.title")}</h2><p className="form-intro">{intro || t("form.intro")}</p>
    <label htmlFor="full_name">{t("form.name")} *</label><input id="full_name" name="full_name" value={form.full_name} onChange={update} autoComplete="name" minLength={2} maxLength={100} required />
    <label htmlFor="phone">{t("form.phone")} *</label><input id="phone" name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel" minLength={9} maxLength={20} required />
    <label htmlFor="course">{t("form.course")} *</label><select id="course" name="course" value={form.course} onChange={update} required>{courses.map((course) => <option key={course.id} value={course.name}>{courseName(course)}</option>)}</select>
    <label htmlFor="message">{t("form.message")}</label><textarea id="message" name="message" value={form.message} onChange={update} maxLength={1000} rows={5} placeholder={t("form.messagePlaceholder")} />
    <button className="button button-primary submit-button" type="submit" disabled={submitting || courses.length === 0}>{submitting ? t("form.sending") : `${t("form.submit")} →`}</button>
    {notice && <p className={`form-notice ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>{notice.text}</p>}
  </form>;
}
