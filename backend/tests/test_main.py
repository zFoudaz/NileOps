from pathlib import Path
from app.config import settings


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_static_uploads_mounted(client):
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    test_file = upload_dir / "test_static.txt"
    test_file.write_text("hello uploads")
    try:
        response = client.get("/uploads/test_static.txt")
        assert response.status_code == 200
        assert response.text == "hello uploads"
    finally:
        if test_file.exists():
            test_file.unlink()
