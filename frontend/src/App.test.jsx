/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";

const courses = [
  { id: 1, name: "Theory Driving Lessons", description: "Learn road signs, traffic rules and road safety." },
  { id: 2, name: "Practical Driving Lessons", description: "Develop vehicle handling and road-driving skills." },
  { id: 3, name: "Driving Test Preparation", description: "Prepare for driving assessments and examinations." },
];

function renderRoute(path, language = "en") {
  localStorage.setItem("teacherEricLanguage", language);
  return render(<LanguageProvider><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></LanguageProvider>);
}

describe("public and administrator routes", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      if (String(url).endsWith("/api/courses")) return { ok: true, json: async () => courses };
      if (String(url).endsWith("/api/inquiries") && options.method === "POST") return { ok: true, json: async () => ({ inquiry_id: 1 }) };
      if (String(url).endsWith("/api/admin/login")) return { ok: true, json: async () => ({ access_token: "test-session-token" }) };
      if (String(url).endsWith("/api/admin/me")) return { ok: true, json: async () => ({ email: "admin@example.com", role: "admin" }) };
      if (String(url).endsWith("/api/admin/stats")) return { ok: true, json: async () => ({ total: 0, pending: 0, contacted: 0, enrolled: 0, rejected: 0 }) };
      return { ok: false, json: async () => ({ detail: "Request failed" }) };
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the homepage and shared navigation", async () => {
    renderRoute("/");
    expect(screen.getByRole("heading", { name: /learn to drive/i })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: /driving instructor guiding a learner/i }).getAttribute("src")).toBe("/images/Home_Page_Image.jpg");
    expect(await screen.findByText("Theory Driving Lessons")).toBeTruthy();
  });

  it("defaults to Kinyarwanda and switches language without leaving the route", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<LanguageProvider><MemoryRouter initialEntries={["/"]}><App /></MemoryRouter></LanguageProvider>);
    expect(screen.getByRole("heading", { name: /Iga gutwara ikinyabiziga/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Umwarimu yigisha umunyeshuri gutwara imodoka" }).getAttribute("src")).toBe("/images/Home_Page_Image.jpg");
    expect(screen.getAllByRole("link", { name: /Iyandikishe nonaha/i })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Reba amasomo" })).toBeTruthy();
    expect(screen.getAllByText("Driving School")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Teacher Eric Driving School/i })).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "Ururimi" }), "en");
    expect(screen.getByRole("heading", { name: /Learn to drive/i })).toBeTruthy();
    expect(localStorage.getItem("teacherEricLanguage")).toBe("en");
  });

  it("navigates from the shared header to the dedicated courses page", async () => {
    const user = userEvent.setup();
    renderRoute("/");
    await user.click(screen.getByRole("link", { name: "Courses" }));
    expect(await screen.findByRole("heading", { name: "Find a place to start" })).toBeTruthy();
  });

  it("shows the About introduction image and existing school sections in Kinyarwanda", async () => {
    renderRoute("/about", "rw");
    const image = screen.getByRole("img", { name: "Umwarimu arimo kwereka umunyeshuri uko atwara imodoka." });
    expect(image.getAttribute("src")).toBe("/images/About(1).jpg");
    expect(screen.getByText("INSHINGANO")).toBeTruthy();
    expect(screen.getByText("ICYEREKEZO")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Indangagaciro zacu" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Iga, itoze, wisuzume." })).toBeTruthy();
  });

  it("matches course images by course ID even if the API returns a different order", async () => {
    fetch.mockImplementationOnce(async () => ({ ok: true, json: async () => [courses[2], courses[0], courses[1]] }));
    renderRoute("/courses");
    const imageMatches = [
      ["Road warning signs used when learning traffic rules.", "/images/Theoretical_Couse_Image.jpg"],
      ["A car being driven along a road during practical training.", "/images/Practical_Leassons.jpg"],
      ["A driving examiner guiding a vehicle through a test course.", "/images/Driving_Test.jpg"],
    ];
    for (const [alt, src] of imageMatches) {
      expect((await screen.findByRole("img", { name: alt })).getAttribute("src")).toBe(src);
    }
  });

  it("loads courses and shows course details from the API", async () => {
    renderRoute("/courses/2");
    expect(await screen.findByRole("heading", { name: "Practical Driving Lessons" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "A car being driven along a road during practical training." }).getAttribute("src")).toBe("/images/Practical_Leassons.jpg");
    expect(screen.getByText(/vehicle controls and basic operation/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /ask about this course/i }).getAttribute("href")).toBe("/enroll?course=2");
  });

  it("handles an unknown course and an unknown public route", async () => {
    const { unmount } = renderRoute("/courses/987");
    expect(await screen.findByText("This course is unavailable.")).toBeTruthy();
    unmount();
    renderRoute("/missing-page");
    expect(screen.getByText("We could not find that page.")).toBeTruthy();
  });

  it("submits the enrollment form and shows confirmation", async () => {
    const user = userEvent.setup();
    renderRoute("/enroll?course=1");
    await user.type(await screen.findByLabelText("Full name *"), "Jordan Learner");
    await user.type(screen.getByLabelText("Phone number *"), "07123456789");
    await user.selectOptions(screen.getByLabelText("Course of interest *"), "Theory Driving Lessons");
    await user.type(screen.getByLabelText("Message"), "Please share enrollment information.");
    await user.click(screen.getByRole("button", { name: /submit inquiry/i }));
    expect(await screen.findByText(/your inquiry was received/i)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/inquiries"), expect.objectContaining({ method: "POST" }));
  });

  it("shows FAQ answers and the official clickable contact methods", async () => {
    const user = userEvent.setup();
    const { unmount } = renderRoute("/faq");
    await user.click(screen.getByText("How much do lessons cost and when are they held?"));
    expect(screen.getByText(/prices and schedules are not published/i)).toBeTruthy();
    unmount();
    renderRoute("/contact");
    const phone = screen.getByRole("link", { name: "Call: +250783393851" });
    const whatsapp = screen.getByRole("link", { name: "WhatsApp: +250783393851" });
    const email = screen.getByRole("link", { name: "Email: ericteacher33@gmail.com" });
    expect(phone.getAttribute("href")).toBe("tel:+250783393851");
    expect(whatsapp.getAttribute("href")).toBe("https://wa.me/250783393851");
    expect(email.getAttribute("href")).toBe("mailto:ericteacher33@gmail.com");
    for (const link of [phone, whatsapp, email]) {
      expect(link.querySelector("svg")).toBeTruthy();
      expect(link.querySelector("svg").getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("redirects unauthenticated administrator routes to the login page", async () => {
    renderRoute("/admin/inquiries/12");
    expect(await screen.findByRole("heading", { name: "Admin Portal" })).toBeTruthy();
  });

  it("logs in through the admin API and opens the protected overview", async () => {
    const user = userEvent.setup();
    renderRoute("/admin/login");
    await user.type(screen.getByLabelText("Administrator email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "not-a-real-password");
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));
    expect(await screen.findByRole("heading", { name: "Dashboard overview" })).toBeTruthy();
    expect(sessionStorage.getItem("teacherEricAdminToken")).toBe("test-session-token");
  });
});
