import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "./services/api";
import { getCourses } from "./services/api";
import { LanguageSwitcher, useLanguage } from "./i18n/LanguageContext";
import Logo from "./components/Logo";
import "./Admin.css";

const STATUSES = ["pending", "contacted", "enrolled", "rejected"];
const PAGE_SIZE = 25;

async function apiRequest(path, options = {}, token = "") {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch {
    throw new Error("The school server could not be reached.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map((item) => item.msg).join(" ") : data.detail;
    throw new Error(detail || "Request failed");
  }
  return data;
}

function Login({ onLogin }) {
  const { t, apiError } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin(result.access_token);
      navigate("/admin", { replace: true });
    } catch (cause) {
      setError(apiError(cause.message));
    } finally {
      setLoading(false);
    }
  }

  return <main className="admin-login-page"><form className="login-card" onSubmit={submit}>
    <LanguageSwitcher /><Logo className="admin-login-logo" /><p className="eyebrow">Teacher Eric Driving School</p><h1>{t("admin.login.title")}</h1>
    <p className="muted">{t("admin.login.intro")}</p>
    <label htmlFor="admin-email">{t("admin.login.email")}</label><input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
    <label htmlFor="admin-password">{t("admin.login.password")}</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
    {error && <p className="error-message" role="alert">{error}</p>}
    <button className="primary-button" disabled={loading}>{loading ? t("admin.login.submitting") : t("admin.login.submit")}</button>
    <Link className="back-link" to="/">â† {t("admin.login.back")}</Link>
  </form></main>;
}

function LearningVideos({ token, apiError }) {
  const { t, courseName } = useLanguage();
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { course_id: "", title: "", description: "", source_type: "youtube", video_url: "", thumbnail_url: "", is_published: false, display_order: "" };
  const [form, setForm] = useState(empty);
  const [filters, setFilters] = useState({ search: "", publication: "all", course_id: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const loadCourses = useCallback(async () => { setCoursesLoading(true); setCoursesError(""); try { const result = await getCourses(); const list = Array.isArray(result) ? result : result?.courses; if (!Array.isArray(list)) throw new Error("Invalid courses response"); setCourses(list); } catch (cause) { setCoursesError(apiError(cause.message)); } finally { setCoursesLoading(false); } }, [apiError]);
  const load = useCallback(async () => { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "")); const videoResult = await apiRequest(`/api/admin/videos?${query}`, {}, token); setVideos(videoResult.videos || []); }, [token, filters]);
  const refreshVideos = useCallback(() => Promise.resolve().then(load).catch((cause) => setError(apiError(cause.message))), [load, apiError]);
  useEffect(() => { Promise.resolve().then(loadCourses); }, [loadCourses]);
  useEffect(() => { refreshVideos(); }, [refreshVideos]);
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event) { event.preventDefault(); setError(""); setSuccess(""); const courseId = Number(form.course_id); if (!form.course_id || !Number.isInteger(courseId) || !courses.some((course) => course.id === courseId)) { setError(t("admin.videos.courseRequired")); return; } const displayOrder = form.display_order === "" ? 0 : Number(form.display_order); if (!Number.isInteger(displayOrder) || displayOrder < 0) { setError(t("admin.videos.orderInvalid")); return; } const thumbnail = form.thumbnail_url.trim(); if (thumbnail) { try { const parsed = new URL(thumbnail); if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) throw new Error(); } catch { setError(t("admin.videos.thumbnailInvalid")); return; } } try { const path = editing ? `/api/admin/videos/${editing.id}` : "/api/admin/videos"; await apiRequest(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...form, course_id: courseId, display_order: displayOrder, thumbnail_url: thumbnail || null }) }, token); setForm(empty); setEditing(null); setSuccess(t("admin.videos.saved")); await load(); } catch (cause) { setError(/thumbnail url/i.test(cause.message) ? t("admin.videos.thumbnailInvalid") : apiError(cause.message)); } }
  async function remove(video) { if (!window.confirm(t("admin.videos.deleteConfirm", { title: video.title }))) return; try { await apiRequest(`/api/admin/videos/${video.id}`, { method: "DELETE" }, token); await load(); } catch (cause) { setError(apiError(cause.message)); } }
  function edit(video) { setEditing(video); setForm({ ...empty, ...video, course_id: String(video.course_id), thumbnail_url: video.thumbnail_url || "", display_order: video.display_order ?? "" }); }
  const hasValidCourse = courses.some((course) => String(course.id) === String(form.course_id));
  return <section className="inquiries-panel video-admin-panel"><div className="panel-heading"><div><h2>{t("admin.videos.title")}</h2><p>{t("admin.videos.intro")}</p></div><span className="record-count">{videos.length} {t("admin.videos.count")}</span></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {success && <p className="success-message" role="status">{success}</p>}
    <div className="course-load-state" aria-live="polite">{coursesLoading && <p role="status">{t("admin.videos.loadingCourses")}</p>}{!coursesLoading && coursesError && <p className="error-message" role="alert">{coursesError} <button className="text-button" type="button" onClick={loadCourses}>{t("admin.videos.retryCourses")}</button></p>}{!coursesLoading && !coursesError && courses.length === 0 && <p className="empty-state">{t("admin.videos.noCourses")}</p>}</div>
    <form className="video-admin-form" onSubmit={submit}><h3>{editing ? t("admin.videos.edit") : t("admin.videos.add")}</h3><label>{t("admin.videos.titleField")}<input value={form.title} onChange={(event) => update("title", event.target.value)} required maxLength="200" /></label><label>{t("admin.videos.description")}<textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength="2000" /></label><label>{t("admin.videos.course")}<select value={form.course_id} onChange={(event) => update("course_id", event.target.value)} required disabled={coursesLoading || Boolean(coursesError) || courses.length === 0}><option value="">{coursesLoading ? t("admin.videos.loadingCourses") : coursesError ? t("admin.videos.coursesUnavailable") : courses.length === 0 ? t("admin.videos.noCourses") : t("admin.videos.selectCourse")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{courseName(course)}</option>)}</select></label><label>{t("admin.videos.source")}<select value={form.source_type} onChange={(event) => update("source_type", event.target.value)}><option value="youtube">YouTube</option><option value="direct">{t("admin.videos.directSource")}</option></select></label><label>{t("admin.videos.url")}<input type="url" value={form.video_url} onChange={(event) => update("video_url", event.target.value)} required /></label><label>{t("admin.videos.thumbnail")}<input type="url" value={form.thumbnail_url} onChange={(event) => update("thumbnail_url", event.target.value)} /></label><label>{t("admin.videos.order")}<input type="number" min="0" value={form.display_order} onChange={(event) => update("display_order", event.target.value)} /></label><label className="checkbox-field"><input type="checkbox" checked={form.is_published} onChange={(event) => update("is_published", event.target.checked)} /> {t("admin.videos.publish")}</label><div><button className="primary-button" type="submit" disabled={coursesLoading || Boolean(coursesError) || !hasValidCourse}>{editing ? t("admin.videos.save") : t("admin.videos.add")}</button>{editing && <button className="refresh-button" type="button" onClick={() => { setEditing(null); setForm(empty); }}>{t("admin.videos.cancel")}</button>}</div></form>
    <div className="table-filters"><input type="search" placeholder={t("admin.videos.search")} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.course_id} onChange={(event) => setFilters({ ...filters, course_id: event.target.value })}><option value="">{t("admin.videos.allCourses")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{courseName(course)}</option>)}</select><select value={filters.publication} onChange={(event) => setFilters({ ...filters, publication: event.target.value })}><option value="all">{t("admin.videos.allStatuses")}</option><option value="published">{t("admin.videos.published")}</option><option value="draft">{t("admin.videos.draft")}</option></select></div><div className="table-scroll"><table className="inquiries-table"><thead><tr><th>{t("admin.videos.titleField")}</th><th>{t("admin.videos.course")}</th><th>{t("admin.status")}</th><th>{t("admin.manageColumn")}</th></tr></thead><tbody>{videos.map((video) => <tr key={video.id}><td>{video.title}</td><td>{courses.find((course) => course.id === video.course_id) ? courseName(courses.find((course) => course.id === video.course_id)) : video.course_id}</td><td>{video.is_published ? t("admin.videos.published") : t("admin.videos.draft")}</td><td><button className="text-button" onClick={() => edit(video)}>{t("admin.videos.edit")}</button> <button className="text-button danger-text" onClick={() => remove(video)}>{t("admin.videos.delete")}</button></td></tr>)}{videos.length === 0 && <tr><td colSpan="4" className="empty-state">{t("admin.videos.empty")}</td></tr>}</tbody></table></div>
  </section>;
}

function Dashboard() {
  const { t, apiError, statusLabel, courseName } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const path = location.pathname;
  const isLogin = path === "/admin/login";
  const isOverview = path === "/admin" || path === "/admin/" || path === "/admin/overview";
  const isList = path === "/admin/inquiries";
  const isVideos = path === "/admin/videos";
  const isDetail = /^\/admin\/inquiries\/\d+$/.test(path);
  const [token, setToken] = useState(() => sessionStorage.getItem("teacherEricAdminToken") || "");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    sessionStorage.removeItem("teacherEricAdminToken");
    setToken("");
    setUser(null);
    setStats(null);
    setInquiries([]);
    setSelected(null);
    navigate("/admin/login", { replace: true });
  }, [navigate]);

  function handleLogin(accessToken) {
    sessionStorage.setItem("teacherEricAdminToken", accessToken);
    setToken(accessToken);
  }

  const loadPage = useCallback(async () => {
    if (!token || isLogin) return;
    setLoading(true);
    setError("");
    try {
      const me = await apiRequest("/api/admin/me", {}, token);
      setUser(me);
      if (isOverview) setStats(await apiRequest("/api/admin/stats", {}, token));
      if (isList) {
        const query = new URLSearchParams({ search, status: statusFilter, page: String(page), page_size: String(PAGE_SIZE) });
        const result = await apiRequest(`/api/admin/inquiries?${query}`, {}, token);
        setInquiries(result.inquiries || []);
        setTotalMatches(result.count || 0);
      }
      if (isDetail) setSelected(await apiRequest(`/api/admin/inquiries/${id}`, {}, token));
    } catch (cause) {
      if (/token|login|unauthorized|invalid|administrator access/i.test(cause.message)) logout();
      else setError(apiError(cause.message));
    } finally {
      setLoading(false);
    }
  }, [token, isLogin, isOverview, isList, isDetail, id, search, statusFilter, page, logout, apiError]);

  useEffect(() => {
    let active = true;
    if (token && !isLogin) Promise.resolve().then(() => active && loadPage());
    return () => { active = false; };
  }, [token, isLogin, loadPage]);

  async function changeStatus(inquiry, nextStatus) {
    try {
      await apiRequest(`/api/admin/inquiries/${inquiry.id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }, token);
      await loadPage();
    } catch (cause) {
      setError(apiError(cause.message));
    }
  }

  if (isLogin) return token ? <Navigate to="/admin" replace /> : <Login onLogin={handleLogin} />;
  if (!token) return <Navigate to="/admin/login" replace />;
  if (!isOverview && !isList && !isDetail && !isVideos) return <Navigate to="/admin" replace />;

  const pageTitle = t(isOverview ? "admin.title.overview" : isList ? "admin.title.inquiries" : isVideos ? "admin.videos.title" : "admin.title.detail");
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link to="/admin" className="sidebar-brand"><Logo className="admin-sidebar-logo" /><span><strong>Teacher Eric</strong><small>{t("brand.school")}</small></span></Link>
      <p className="sidebar-label">{t("admin.workspace")}</p><LanguageSwitcher className="admin-language" />
      <NavLink to="/admin" end className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>â–¦ &nbsp; {t("admin.overview")}</NavLink>
      <NavLink to="/admin/inquiries" className={({ isActive }) => `sidebar-link${isActive || isDetail ? " active" : ""}`}>â–¤ &nbsp; {t("admin.inquiries")}</NavLink>
      <NavLink to="/admin/videos" className={({ isActive }) => `sidebar-link${isActive || isVideos ? " active" : ""}`}>▶ &nbsp; {t("admin.videos.title")}</NavLink>
      <div className="sidebar-bottom"><div className="user-avatar">{(user?.email || "A").charAt(0).toUpperCase()}</div><div className="sidebar-user"><strong>{t("admin.role")}</strong><small>{user?.email || t("admin.verifying")}</small></div><button className="logout-button" onClick={logout} title={t("admin.logout")} aria-label={t("admin.logout")}>â†ª</button></div>
    </aside>

    <main className="admin-main">
      <header className="admin-topbar"><div><p className="eyebrow">{t("admin.workspace")} / {pageTitle.toUpperCase()}</p><h1>{pageTitle}</h1></div><button className="refresh-button" onClick={loadPage} disabled={loading}>{loading ? t("admin.loading") : t("admin.refresh")}</button></header>
      {error && <div className="admin-alert" role="alert">{error}<button onClick={() => setError("")}>{t("admin.dismiss")}</button></div>}
      {isOverview && <section className="stats-grid" aria-label={t("admin.overview")}>
        {[[t("admin.total"), stats?.total ?? "—", t("admin.totalDesc")], [t("admin.pending"), stats?.pending ?? "—", t("admin.pendingDesc")], [t("admin.contacted"), stats?.contacted ?? "—", t("admin.contactedDesc")], [t("admin.enrolled"), stats?.enrolled ?? "—", t("admin.enrolledDesc")], [t("admin.rejected"), stats?.rejected ?? "—", t("admin.rejectedDesc")]].map(([label, value, description], index) => <article className="stat-card" key={label}><div className={`stat-icon stat-icon-${index}`}>{["◤", "◷", "☎", "✓", "×"][index]}</div><p>{label}</p><h2>{value}</h2><small>{description}</small></article>)}
        <div className="admin-overview-link"><p>{t("admin.overviewHint")}</p><Link className="primary-button" to="/admin/inquiries">{t("admin.manage")} →</Link></div>
      </section>}


      {isList && <section className="inquiries-panel">
        <div className="panel-heading"><div><h2>{t("admin.title.inquiries")}</h2><p>{t("admin.review")}</p></div><span className="record-count">{totalMatches} {t("admin.records")}</span></div>
        <div className="table-filters"><input type="search" aria-label={t("admin.search")} placeholder={t("admin.search")} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select aria-label={t("admin.filter")} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">{t("admin.allStatuses")}</option>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
        <div className="pagination-controls"><button className="refresh-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("admin.previous")}</button><span>{t("admin.page")} {page} {t("admin.of")} {Math.max(1, Math.ceil(totalMatches / PAGE_SIZE))}</span><button className="refresh-button" disabled={page * PAGE_SIZE >= totalMatches || loading} onClick={() => setPage((value) => value + 1)}>{t("admin.next")}</button></div>
        <div className="table-scroll"><table className="inquiries-table"><thead><tr><th>{t("admin.applicant")}</th><th>{t("admin.course")}</th><th>{t("admin.date")}</th><th>{t("admin.status")}</th><th>{t("admin.manageColumn")}</th></tr></thead><tbody>
          {inquiries.map((inquiry) => <tr key={inquiry.id}><td><Link className="applicant-link" to={`/admin/inquiries/${inquiry.id}`}>{inquiry.full_name}</Link><small className="phone-text">{inquiry.phone}</small></td><td>{courseName(inquiry.course)}</td><td>{new Date(inquiry.created_at).toLocaleDateString()}</td><td><span className={`status-badge status-${inquiry.status}`}>{statusLabel(inquiry.status)}</span></td><td><select aria-label={`Update status for ${inquiry.full_name}`} value={inquiry.status} onChange={(event) => changeStatus(inquiry, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td></tr>)}
          {!loading && inquiries.length === 0 && <tr><td colSpan="5" className="empty-state">{t("admin.noInquiries")}</td></tr>}
        </tbody></table></div>
      </section>}

      {isDetail && <section className="inquiries-panel detail-page"><p className="breadcrumbs"><Link to="/admin">{t("admin.breadcrumbOverview")}</Link> / <Link to="/admin/inquiries">{t("admin.breadcrumbInquiries")}</Link> / {id}</p>{loading && !selected ? <p role="status">{t("admin.loading")}</p> : selected && <><h2>{selected.full_name}</h2><div className="detail-fields"><p><strong>{t("admin.phone")}</strong><a href={`tel:${selected.phone}`}>{selected.phone}</a></p><p><strong>{t("admin.course")}</strong>{courseName(selected.course)}</p><p><strong>{t("admin.received")}</strong>{new Date(selected.created_at).toLocaleString()}</p><p><strong>{t("admin.currentStatus")}</strong><span className={`status-badge status-${selected.status}`}>{statusLabel(selected.status)}</span></p></div><h3>{t("admin.message")}</h3><div className="message-box">{selected.message || t("admin.noMessage")}</div><label className="status-field" htmlFor="detail-status">{t("admin.updateStatus")}</label><select id="detail-status" value={selected.status} onChange={(event) => changeStatus(selected, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><p><Link className="text-link" to="/admin/inquiries">← {t("admin.backInquiries")}</Link></p></>}</section>}
      {isVideos && <LearningVideos token={token} apiError={apiError} />}
    </main>
  </div>;
}

export default function Admin() {
  return <Dashboard />;
}

