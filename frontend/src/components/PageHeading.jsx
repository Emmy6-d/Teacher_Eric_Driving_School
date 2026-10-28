export default function PageHeading({ eyebrow, title, children }) {
  return (
    <header className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
