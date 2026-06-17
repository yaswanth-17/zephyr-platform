"""
core/config.py — central settings loaded from .env or environment variables
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Paths to the JSON files produced by the parser
    DATA_DIR: Path = Path("../data/json")

    @property
    def bindings_json(self) -> Path:
        return self.DATA_DIR / "bindings.json"

    @property
    def boards_json(self) -> Path:
        return self.DATA_DIR / "boards.json"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
