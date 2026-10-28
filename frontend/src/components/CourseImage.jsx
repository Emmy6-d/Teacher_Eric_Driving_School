import { useState } from "react";
import { courseImages } from "../data/courseImages";
import { useLanguage } from "../i18n/LanguageContext";

export default function CourseImage({ course, className = "" }) {
  const { t } = useLanguage();
  const image = courseImages[course?.id];
  const [failedSrc, setFailedSrc] = useState("");

  return (
    <div className={`course-image-frame ${className}`.trim()}>
      {image && failedSrc !== image.src ? (
        <img src={image.src} alt={t(image.altKey)} loading="lazy" decoding="async" onError={() => setFailedSrc(image.src)} />
      ) : (
        <div className="course-image-fallback" role="img" aria-label={t("course.imageUnavailable")}>
          <span aria-hidden="true">TE</span>
        </div>
      )}
    </div>
  );
}
