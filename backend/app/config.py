from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "Bite a Fruit"
    environment: str = "development"
    log_level: str = "INFO"
    excel_storage: Literal["local", "s3"] = "local"
    excel_database_path: str = "data/biteafruit.xlsx"
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    frontend_origin: str = "http://localhost:5173"
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    cloudinary_url: str | None = None
    google_client_id: str | None = None
    aws_region: str | None = None
    excel_s3_bucket: str | None = None
    excel_s3_key: str | None = None
    allow_unsafe_excel_s3: bool = False

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"prod", "production"}

    @property
    def excel_database_cache_path(self) -> Path:
        path = Path(self.excel_database_path)
        if path.is_absolute():
            return path
        return BACKEND_DIR / path

    @property
    def use_excel_s3(self) -> bool:
        return self.excel_storage == "s3" or bool(self.excel_s3_bucket and self.excel_s3_key)

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.excel_storage == "s3" and not (self.excel_s3_bucket and self.excel_s3_key):
            raise ValueError("EXCEL_S3_BUCKET and EXCEL_S3_KEY are required when EXCEL_STORAGE=s3")

        if self.is_production:
            if self.jwt_secret == "change-this-in-production" or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to a strong value in production")
            if self.frontend_origin.startswith("http://localhost") or self.frontend_origin.startswith("http://127.0.0.1"):
                raise ValueError("FRONTEND_ORIGIN must be a deployed HTTPS origin in production")
            if self.use_excel_s3 and not self.allow_unsafe_excel_s3:
                raise ValueError(
                    "Excel-over-S3 is unsafe for concurrent production writes. "
                    "Use persistent single-instance storage or migrate to a database."
                )
        return self


settings = Settings()
