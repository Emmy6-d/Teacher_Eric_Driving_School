const LOGO_SRC = "/images/Teacher Eric Driving School Logo.png";

export default function Logo({ className = "", alt = "Teacher Eric Driving School logo" }) {
  return <img className={`school-logo ${className}`.trim()} src={LOGO_SRC} alt={alt} decoding="async" />;
}
