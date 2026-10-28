"""FastAPI API for the Teacher Eric Driving School website."""

import os
import re
import threading
import time
from collections import defaultdict, deque
from typing import Literal
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
SUPABASE_SECRET_KEY = (os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
ADMIN_EMAILS = {
    value.strip().lower()
    for value in os.getenv("ADMIN_EMAILS", os.getenv("ADMIN_EMAIL", "")).split(",")
    if value.strip()
}
COURSES = (
    (1, "Theory Driving Lessons", "Learn road signs, traffic rules and road safety."),
    (2, "Practical Driving Lessons", "Develop vehicle handling and road-driving skills."),
    (3, "Driving Test Preparation", "Prepare for driving assessments and examinations."),
)
STATUSES = ("pending", "contacted", "enrolled", "rejected")

if not all((SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, ADMIN_EMAILS)):
    raise RuntimeError(
        "Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, "
        "and ADMIN_EMAILS in backend/.env"
    )

# This credential is server-side only and must be restricted to the backend host.
db: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
bearer = HTTPBearer(auto_error=False)
app = FastAPI(title="Teacher Eric Driving School API", version="2.1.0")
origins = [item.strip().rstrip("/") for item in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


class EnrollmentInquiry(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=9, max_length=20)
    course: Literal["Theory Driving Lessons", "Practical Driving Lessons", "Driving Test Preparation"]
    message: str = Field(default="", max_length=1000)

    @field_validator("full_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if len(value) < 2 or not any(char.isalpha() for char in value):
            raise ValueError("Enter a valid full name")
        return value

    @field_validator("phone")
    @classmethod
    def phone_has_enough_digits(cls, value: str) -> str:
        digits = sum(char.isdigit() for char in value)
        if digits < 9:
            raise ValueError("Enter a phone number with at least 9 digits")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["pending", "contacted", "enrolled", "rejected"]


VIDEO_SOURCE_TYPES = ("youtube", "direct")


def youtube_video_id(value: str) -> str | None:
    """Return a YouTube video id for supported public URL forms."""
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        return None
    host = parsed.netloc.lower().split(":", 1)[0]
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            candidate = parse_qs(parsed.query).get("v", [None])[0]
        elif parsed.path.startswith("/embed/"):
            candidate = parsed.path.split("/", 2)[2]
        else:
            candidate = None
    elif host in {"youtu.be", "www.youtu.be"}:
        candidate = parsed.path.strip("/").split("/", 1)[0]
    else:
        candidate = None
    return candidate if candidate and re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else None


def youtube_thumbnail_url(value: str) -> str | None:
    video_id = youtube_video_id(value)
    return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg" if video_id else None


class VideoPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    course_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    source_type: Literal["youtube", "direct"]
    video_url: str = Field(min_length=1, max_length=2048)
    thumbnail_url: str | None = Field(default=None, max_length=2048)
    is_published: bool = False
    display_order: int = Field(default=0, ge=0, le=100000)

    @field_validator("video_url")
    @classmethod
    def valid_video_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Video URL must be a valid HTTP or HTTPS URL")
        return value

    @field_validator("thumbnail_url", mode="before")
    @classmethod
    def normalize_thumbnail_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("thumbnail_url")
    @classmethod
    def valid_thumbnail_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Thumbnail URL must be a valid HTTP or HTTPS URL")
        return value

    @field_validator("source_type")
    @classmethod
    def source_type_is_supported(cls, value: str) -> str:
        if value not in VIDEO_SOURCE_TYPES:
            raise ValueError("Unsupported video source")
        return value

    def validate_source_url(self) -> None:
        if self.source_type == "youtube" and not youtube_video_id(self.video_url):
            raise ValueError("Use a supported YouTube watch, youtu.be, or embed URL")
        if self.source_type == "direct" and youtube_video_id(self.video_url):
            raise ValueError("YouTube URLs must use the YouTube source")


class VideoUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    course_id: int | None = Field(default=None, gt=0)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    source_type: Literal["youtube", "direct"] | None = None
    video_url: str | None = Field(default=None, min_length=1, max_length=2048)
    thumbnail_url: str | None = Field(default=None, max_length=2048)
    is_published: bool | None = None
    display_order: int | None = Field(default=None, ge=0, le=100000)

    @field_validator("thumbnail_url", mode="before")
    @classmethod
    def normalize_optional_thumbnail_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("video_url", "thumbnail_url")
    @classmethod
    def valid_optional_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("URL must be a valid HTTP or HTTPS URL")
        return value


# Per-process login throttle. Use a shared gateway/store for multi-worker deployments.
_login_attempts: dict[str, deque[float]] = defaultdict(deque)
_login_lock = threading.Lock()
LOGIN_WINDOW_SECONDS = 300
LOGIN_MAX_ATTEMPTS = 8


def check_login_rate(request: Request) -> None:
    now = time.monotonic()
    key = request.client.host if request.client else "unknown"
    with _login_lock:
        attempts = _login_attempts[key]
        while attempts and now - attempts[0] > LOGIN_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= LOGIN_MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many sign-in attempts. Try again later.")
        attempts.append(now)


def require_admin(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Login required")
    try:
        # Supabase Auth verifies signature, issuer, expiry and user existence.
        auth_client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        response = auth_client.auth.get_user(credentials.credentials)
        user = response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session") from None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if (user.email or "").strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


def database_unavailable(message: str) -> HTTPException:
    return HTTPException(status_code=503, detail=message)


@app.get("/")
def home():
    return {"message": "Welcome to Teacher Eric Driving School API"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/courses")
def get_courses():
    return [{"id": i, "name": name, "description": description} for i, name, description in COURSES]


def video_response(row: dict) -> dict:
    item = dict(row)
    if item.get("source_type") == "youtube":
        video_id = youtube_video_id(item.get("video_url", ""))
        if video_id:
            item["embed_url"] = f"https://www.youtube.com/embed/{video_id}"
            if not item.get("thumbnail_url"):
                item["thumbnail_url"] = youtube_thumbnail_url(item["video_url"])
    return item


def validate_course_id(course_id: int) -> None:
    if course_id not in {course[0] for course in COURSES}:
        raise HTTPException(status_code=422, detail="Select a valid course")


@app.get("/api/videos")
def public_videos(course_id: int | None = Query(default=None, gt=0)):
    try:
        query = (
            db.table("course_videos")
            .select("*")
            .eq("is_published", True)
            .order("display_order")
            .order("created_at")
        )
        if course_id is not None:
            validate_course_id(course_id)
            query = query.eq("course_id", course_id)
        result = query.execute()
        return [video_response(row) for row in (result.data or [])]
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not load learning videos") from None


@app.get("/api/courses/{course_id}/videos")
def public_course_videos(course_id: int):
    return public_videos(course_id)


@app.get("/api/videos/{video_id}")
def public_video(video_id: int):
    try:
        result = (
            db.table("course_videos")
            .select("*")
            .eq("id", video_id)
            .eq("is_published", True)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Video not found")
        return video_response(result.data[0])
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not load learning video") from None


@app.get("/api/admin/videos")
def admin_videos(
    search: str = Query(default="", max_length=100),
    course_id: int | None = Query(default=None, gt=0),
    publication: Literal["all", "draft", "published"] = "all",
    user=Depends(require_admin),
):
    try:
        query = db.table("course_videos").select("*").order("display_order").order("created_at", desc=True)
        if course_id is not None:
            validate_course_id(course_id)
            query = query.eq("course_id", course_id)
        if publication != "all":
            query = query.eq("is_published", publication == "published")
        term = re.sub(r"[^\w +'\-]", "", search, flags=re.UNICODE).strip()
        if term:
            pattern = f"%{term}%"
            query = query.or_(f"title.ilike.{pattern},description.ilike.{pattern}")
        result = query.execute()
        return {"videos": [video_response(row) for row in (result.data or [])]}
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not load learning videos") from None


@app.post("/api/admin/videos", status_code=201)
def create_video(payload: VideoPayload, user=Depends(require_admin)):
    validate_course_id(payload.course_id)
    try:
        payload.validate_source_url()
        video_data = payload.model_dump()
        if payload.source_type == "youtube" and not video_data.get("thumbnail_url"):
            video_data["thumbnail_url"] = youtube_thumbnail_url(payload.video_url)
        result = db.table("course_videos").insert(video_data).execute()
        if not result.data:
            raise database_unavailable("Could not create learning video")
        return video_response(result.data[0])
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not create learning video") from None


@app.patch("/api/admin/videos/{video_id}")
def update_video(video_id: int, payload: VideoUpdate, user=Depends(require_admin)):
    changes = payload.model_dump(exclude_unset=True)
    if "course_id" in changes:
        validate_course_id(changes["course_id"])
    try:
        current_result = db.table("course_videos").select("*").eq("id", video_id).limit(1).execute()
        if not current_result.data:
            raise HTTPException(status_code=404, detail="Video not found")
        current = current_result.data[0]
        merged = {**current, **changes}
        if not youtube_video_id(merged["video_url"]) and merged["source_type"] == "youtube":
            raise HTTPException(status_code=422, detail="Use a supported YouTube watch, youtu.be, or embed URL")
        if merged["source_type"] == "direct" and youtube_video_id(merged["video_url"]):
            raise HTTPException(status_code=422, detail="YouTube URLs must use the YouTube source")
        if merged["source_type"] == "youtube" and not merged.get("thumbnail_url"):
            changes["thumbnail_url"] = youtube_thumbnail_url(merged["video_url"])
        result = db.table("course_videos").update(changes).eq("id", video_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Video not found")
        return video_response(result.data[0])
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not update learning video") from None


@app.delete("/api/admin/videos/{video_id}", status_code=204)
def delete_video(video_id: int, user=Depends(require_admin)):
    try:
        result = db.table("course_videos").delete().eq("id", video_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Video not found")
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not delete learning video") from None


@app.post("/api/inquiries", status_code=201)
def create_inquiry(inquiry: EnrollmentInquiry):
    try:
        result = db.table("enrollment_inquiries").insert(inquiry.model_dump()).execute()
        if not result.data:
            raise database_unavailable("Unable to save your inquiry. Please try again later.")
        return {"message": "Your inquiry was received successfully.", "inquiry_id": result.data[0]["id"]}
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Unable to save your inquiry. Please try again later.") from None


@app.post("/api/admin/login")
def admin_login(payload: LoginRequest, request: Request):
    check_login_rate(request)
    email = payload.email.lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    try:
        auth_client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        response = auth_client.auth.sign_in_with_password({"email": email, "password": payload.password})
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return {"access_token": response.session.access_token, "token_type": "bearer", "email": response.user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password") from None


@app.get("/api/admin/me")
def admin_me(user=Depends(require_admin)):
    return {"email": user.email, "role": "admin"}


@app.get("/api/admin/inquiries")
def admin_inquiries(
    search: str = Query(default="", max_length=100),
    status: Literal["all", "pending", "contacted", "enrolled", "rejected"] = "all",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    user=Depends(require_admin),
):
    try:
        query = db.table("enrollment_inquiries").select("*", count="exact").order("created_at", desc=True)
        if status != "all":
            query = query.eq("status", status)
        # Restrict PostgREST filter syntax characters to avoid filter injection.
        term = re.sub(r"[^\w +'\-]", "", search, flags=re.UNICODE).strip()
        if term:
            pattern = f"%{term}%"
            query = query.or_(f"full_name.ilike.{pattern},phone.ilike.{pattern}")
        start = (page - 1) * page_size
        result = query.range(start, start + page_size - 1).execute()
        return {"inquiries": result.data or [], "count": result.count or 0, "page": page, "page_size": page_size}
    except Exception:
        raise database_unavailable("Could not load inquiries") from None


@app.get("/api/admin/stats")
def admin_stats(user=Depends(require_admin)):
    try:
        counts = {}
        for status in STATUSES:
            result = db.table("enrollment_inquiries").select("id", count="exact").eq("status", status).limit(1).execute()
            counts[status] = result.count or 0
        all_rows = db.table("enrollment_inquiries").select("id", count="exact").limit(1).execute()
        return {"total": all_rows.count or 0, **counts}
    except Exception:
        raise database_unavailable("Could not load statistics") from None


@app.get("/api/admin/inquiries/{inquiry_id}")
def admin_inquiry_detail(inquiry_id: int, user=Depends(require_admin)):
    try:
        result = db.table("enrollment_inquiries").select("*").eq("id", inquiry_id).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not load inquiry") from None


@app.patch("/api/admin/inquiries/{inquiry_id}/status")
def update_inquiry_status(inquiry_id: int, update: StatusUpdate, user=Depends(require_admin)):
    try:
        result = db.table("enrollment_inquiries").update({"status": update.status}).eq("id", inquiry_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        return {"message": "Inquiry status updated", "inquiry": result.data[0]}
    except HTTPException:
        raise
    except Exception:
        raise database_unavailable("Could not update status") from None
