from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv

# Load packages/api/.env (next to this package) before the Settings fields are
# evaluated below. Real environment variables always win over .env values, so
# deployments can inject config without a file. Loaded by path so it works
# regardless of the process's current working directory.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "cash-kitty-api")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    ocr_device: str = os.getenv("OCR_DEVICE", "cuda")
    max_upload_size_bytes: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", "10485760"))
    # Comma-separated list of allowed CORS origins. Defaults to the local dev
    # SPA origin (http://localhost:3000); in production set CORS_ALLOW_ORIGINS in
    # .env to your fixed HTTPS origin (e.g. https://cashkitty.example.com).
    # "*" allows any origin and is not recommended for a reachable deployment.
    cors_allow_origins: tuple[str, ...] = tuple(
        o.strip()
        for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    )
    allowed_mime_types: tuple[str, ...] = (
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    )


settings = Settings()
