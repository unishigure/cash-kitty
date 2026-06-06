from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "cash-kitty-api")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    ocr_device: str = os.getenv("OCR_DEVICE", "cuda")
    max_upload_size_bytes: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", "10485760"))
    # Comma-separated list of allowed CORS origins. "*" allows any origin.
    cors_allow_origins: tuple[str, ...] = tuple(
        o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "*").split(",") if o.strip()
    )
    allowed_mime_types: tuple[str, ...] = (
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    )


settings = Settings()
