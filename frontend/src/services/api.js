const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim();
const developmentApiUrl = "http://127.0.0.1:8000";
const sameOriginApiUrl = typeof window !== "undefined" ? window.location.origin : "";

// VITE_API_URL must be the public HTTPS FastAPI origin in a split deployment.
// A production build without it uses same-origin /api requests instead of
// pointing deployed visitors at their own localhost.
export const API_URL = (configuredApiUrl || (import.meta.env.DEV ? developmentApiUrl : sameOriginApiUrl)).replace(/\/+$/, "");

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("The school server could not be reached. Please try again shortly.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).filter(Boolean).join(" ")
      : data.detail;
    throw new Error(typeof detail === "string" ? detail : "The request could not be completed.");
  }
  return data;
}

export function getCourses() {
  return request("/api/courses");
}

export function submitInquiry(payload) {
  return request("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getVideos(courseId) {
  return request(courseId ? `/api/courses/${courseId}/videos` : "/api/videos");
}
