import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { courseTranslations, translations, apiErrorTranslation } from "./translations";
import { learningObjectives } from "../data/courseContent";

const LanguageContext = createContext(null);
const STORAGE_KEY = "teacherEricLanguage";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "rw";
    } catch {
      return "rw";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The current selection still works if browser storage is unavailable.
    }
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: (next) => setLanguageState(next === "en" ? "en" : "rw"),
    t: (key, variables = {}) => {
      const template = translations[language][key] ?? translations.en[key] ?? key;
      return Object.entries(variables).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, value), template);
    },
    courseName: (course) => {
      if (language !== "rw") return typeof course === "string" ? course : course?.name ?? "";
      const id = typeof course === "object" ? course?.id : Object.keys(courseTranslations).find((key) => courseTranslations[key].englishName === course);
      return courseTranslations[id]?.name ?? (typeof course === "string" ? course : course?.name ?? "");
    },
    courseDescription: (course) => language === "rw"
      ? courseTranslations[course?.id]?.description ?? course?.description ?? ""
      : course?.description ?? "",
    courseObjectives: (course) => language === "rw"
      ? courseTranslations[course?.id]?.objectives ?? learningObjectives[course?.id] ?? []
      : learningObjectives[course?.id] ?? [],
    statusLabel: (status) => translations[language][`status.${status}`] ?? status,
    apiError: (message, scope = "admin") => {
      if (language === "en") return message;
      const key = apiErrorTranslation[message];
      if (key) return translations.rw[key];
      if (/required|at least|too short|too long|should be|invalid/i.test(message || "")) {
        return translations.rw[scope === "form" ? "form.invalid" : "admin.error.invalid"];
      }
      return translations.rw[scope === "form" ? "form.failed" : "admin.error.request"];
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className={`language-switcher ${className}`.trim()}>
      <span>{t("language.label")}</span>
      <select aria-label={t("language.label")} value={language} onChange={(event) => setLanguage(event.target.value)}>
        <option value="rw">Kinyarwanda</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
