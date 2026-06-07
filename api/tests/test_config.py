from app.core.config import Settings


def test_cors_origins_accepts_comma_separated_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")

    settings = Settings(_env_file=None)

    assert settings.CORS_ORIGINS == [
        "http://localhost:3000",
        "http://localhost:3001",
    ]


def test_cors_origins_rejects_empty_items(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000, ,")

    settings = Settings(_env_file=None)

    assert settings.CORS_ORIGINS == ["http://localhost:3000"]


def test_cors_origins_still_accepts_json_env(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS", '["http://localhost:3000", "http://localhost:3001"]'
    )

    settings = Settings(_env_file=None)

    assert settings.CORS_ORIGINS == [
        "http://localhost:3000",
        "http://localhost:3001",
    ]


def test_jwt_expiration_accepts_duration_env(monkeypatch):
    monkeypatch.setenv("JWT_EXPIRES_IN", "7d")

    settings = Settings(_env_file=None)

    assert settings.JWT_EXPIRES_IN == 7 * 24 * 60 * 60


def test_settings_ignore_frontend_and_mcp_env(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")
    monkeypatch.setenv("MCP_JD_PARSER_ENDPOINT", "http://localhost:8001")

    settings = Settings(_env_file=None)

    assert settings.FRONTEND_URL == "http://localhost:3000"
