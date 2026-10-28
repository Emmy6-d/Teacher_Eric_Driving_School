from types import SimpleNamespace
from unittest.mock import MagicMock

import main
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    return TestClient(main.app)


def test_health_and_courses(client):
    assert client.get("/api/health").json() == {"status": "healthy"}
    courses = client.get("/api/courses").json()
    assert [item["name"] for item in courses] == [item[1] for item in main.COURSES]


def test_invalid_public_inquiries_are_rejected_without_database_write(client, monkeypatch):
    db = MagicMock()
    monkeypatch.setattr(main, "db", db)
    response = client.post("/api/inquiries", json={"full_name": "", "phone": "123", "course": "Other"})
    assert response.status_code == 422
    db.table.assert_not_called()


def test_valid_public_inquiry_is_inserted_once(client, monkeypatch):
    db = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value.data = [{"id": 42}]
    monkeypatch.setattr(main, "db", db)
    payload = {
        "full_name": "Alex Driver",
        "phone": "+1 555 555 1234",
        "course": "Theory Driving Lessons",
        "message": "Please contact me.",
    }
    response = client.post("/api/inquiries", json=payload)
    assert response.status_code == 201
    assert response.json()["inquiry_id"] == 42
    db.table.assert_called_once_with("enrollment_inquiries")
    db.table.return_value.insert.assert_called_once_with(payload)


def test_admin_routes_require_authentication(client):
    response = client.get("/api/admin/inquiries")
    assert response.status_code == 401


def test_admin_video_list_rejects_empty_course_filter_with_field_location(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    response = client.get("/api/admin/videos?course_id=", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["query", "course_id"]
    assert "valid integer" in error["msg"]


def test_admin_video_list_accepts_numeric_course_filter(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    db = MagicMock()
    row = {"id": 4, "course_id": 2, "title": "Turning safely", "source_type": "direct", "video_url": "https://cdn.example.com/turning.mp4"}
    db.table.return_value.select.return_value.order.return_value.order.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=[row])
    monkeypatch.setattr(main, "db", db)
    response = client.get("/api/admin/videos?course_id=2", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    assert response.json() == {"videos": [row]}


def test_admin_video_creation_requires_numeric_course_id_and_accepts_valid_id(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    db = MagicMock()
    row = {"id": 8, "course_id": 1, "title": "Road signs", "description": "", "source_type": "youtube", "video_url": "https://youtu.be/dQw4w9WgXcQ", "is_published": False, "display_order": 0}
    db.table.return_value.insert.return_value.execute.return_value = SimpleNamespace(data=[row])
    monkeypatch.setattr(main, "db", db)
    headers = {"Authorization": "Bearer valid-token"}
    valid = client.post("/api/admin/videos", json={"course_id": 1, "title": "Road signs", "source_type": "youtube", "video_url": "https://youtu.be/dQw4w9WgXcQ", "thumbnail_url": "   "}, headers=headers)
    assert valid.status_code == 201
    assert valid.json()["course_id"] == 1
    db.table.return_value.insert.assert_called_once()
    assert db.table.return_value.insert.call_args.args[0]["thumbnail_url"] == "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    invalid = client.post("/api/admin/videos", json={"course_id": "Theory Driving Lessons", "title": "Road signs", "source_type": "youtube", "video_url": "https://youtu.be/dQw4w9WgXcQ"}, headers=headers)
    assert invalid.status_code == 422
    assert invalid.json()["detail"][0]["loc"] == ["body", "course_id"]


def test_admin_video_creation_accepts_custom_thumbnail_and_rejects_invalid_thumbnail(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    db = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value = SimpleNamespace(data=[{"id": 9, "course_id": 1, "source_type": "direct", "video_url": "https://cdn.example.com/lesson.mp4", "thumbnail_url": "https://cdn.example.com/lesson.jpg"}])
    monkeypatch.setattr(main, "db", db)
    headers = {"Authorization": "Bearer valid-token"}
    valid = client.post("/api/admin/videos", json={"course_id": 1, "title": "Lesson", "source_type": "direct", "video_url": "https://cdn.example.com/lesson.mp4", "thumbnail_url": "https://cdn.example.com/lesson.jpg"}, headers=headers)
    assert valid.status_code == 201
    assert db.table.return_value.insert.call_args.args[0]["thumbnail_url"] == "https://cdn.example.com/lesson.jpg"
    invalid = client.post("/api/admin/videos", json={"course_id": 1, "title": "Lesson", "source_type": "direct", "video_url": "https://cdn.example.com/lesson.mp4", "thumbnail_url": "not-a-url"}, headers=headers)
    assert invalid.status_code == 422
    assert invalid.json()["detail"][0]["loc"] == ["body", "thumbnail_url"]


def test_admin_video_creation_rejects_empty_display_order(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    response = client.post("/api/admin/videos", json={"course_id": 1, "title": "Road signs", "source_type": "youtube", "video_url": "https://youtu.be/dQw4w9WgXcQ", "display_order": ""}, headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "display_order"]


def test_admin_token_is_validated_and_email_allowlisted(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="someone@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    response = client.get("/api/admin/me", headers={"Authorization": "Bearer valid-looking-token"})
    assert response.status_code == 403


def test_invalid_admin_token_returns_401(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.side_effect = RuntimeError("expired")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    response = client.get("/api/admin/me", headers={"Authorization": "Bearer expired-token"})
    assert response.status_code == 401


def test_admin_can_update_status_and_invalid_status_is_rejected(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    db = MagicMock()
    db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"id": 9, "status": "contacted"}
    ]
    monkeypatch.setattr(main, "db", db)
    headers = {"Authorization": "Bearer valid-token"}
    response = client.patch("/api/admin/inquiries/9/status", json={"status": "contacted"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["inquiry"]["status"] == "contacted"
    invalid = client.patch("/api/admin/inquiries/9/status", json={"status": "unknown"}, headers=headers)
    assert invalid.status_code == 422


def test_admin_inquiry_list_applies_pagination_and_search(client, monkeypatch):
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    db = MagicMock()
    response_data = [{"id": 7, "full_name": "Alex Driver"}]
    db.table.return_value.select.return_value.order.return_value.or_.return_value.range.return_value.execute.return_value = SimpleNamespace(
        data=response_data, count=1
    )
    monkeypatch.setattr(main, "db", db)
    response = client.get(
        "/api/admin/inquiries?search=Alex&page=2&page_size=10",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 200
    assert response.json() == {"inquiries": response_data, "count": 1, "page": 2, "page_size": 10}
    db.table.return_value.select.return_value.order.return_value.or_.return_value.range.assert_called_once_with(10, 19)


def test_admin_statistics_use_database_count_queries(client, monkeypatch):
    db = MagicMock()
    counts = iter([11, 4, 2, 3, 2, 11])
    db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.side_effect = [
        SimpleNamespace(count=next(counts), data=[]),
        SimpleNamespace(count=next(counts), data=[]),
        SimpleNamespace(count=next(counts), data=[]),
        SimpleNamespace(count=next(counts), data=[]),
    ]
    db.table.return_value.select.return_value.limit.return_value.execute.return_value = SimpleNamespace(count=11, data=[])
    monkeypatch.setattr(main, "db", db)
    auth = MagicMock()
    auth.auth.get_user.return_value.user = SimpleNamespace(email="admin@example.com")
    monkeypatch.setattr(main, "create_client", lambda *args: auth)
    response = client.get("/api/admin/stats", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    assert response.json() == {"total": 11, "pending": 11, "contacted": 4, "enrolled": 2, "rejected": 3}
