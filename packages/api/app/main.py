from __future__ import annotations

import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.schemas import AnalyzeResponse, ErrorResponse, HealthResponse, OCRData
from app.services.ocr_service import OCRService

app = FastAPI(title=settings.app_name, version=settings.app_version)

# The SPA runs on a different origin (and on phones over the LAN), so it calls
# this API cross-origin. Allow configurable origins (default: any).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_service = OCRService(device=settings.ocr_device, visualize=False)


@app.exception_handler(ValueError)
async def value_error_handler(_request, exc: ValueError):
    body = ErrorResponse(code="INVALID_INPUT", message=str(exc)).model_dump()
    return JSONResponse(status_code=400, content=body)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        device=ocr_service.device,
    )


@app.post(
    "/api/ocr/analyze",
    response_model=AnalyzeResponse,
    responses={400: {"model": ErrorResponse}, 415: {"model": ErrorResponse}},
)
async def analyze(image: UploadFile = File(...)) -> AnalyzeResponse:
    if image.content_type not in settings.allowed_mime_types:
        raise HTTPException(
            status_code=415,
            detail=ErrorResponse(
                code="UNSUPPORTED_MEDIA_TYPE",
                message=f"Unsupported content type: {image.content_type}",
            ).model_dump(),
        )

    content = await image.read()
    if not content:
        raise ValueError("Image file is empty")

    if len(content) > settings.max_upload_size_bytes:
        raise ValueError(
            f"Image file is too large. Max size is {settings.max_upload_size_bytes} bytes"
        )

    started = time.perf_counter()
    result = await run_in_threadpool(ocr_service.analyze_image_bytes, content)
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    return AnalyzeResponse(
        success=True,
        data=OCRData(
            store_name=result.store_name,
            total_amount=result.total_amount,
            date=result.date,
            full_text=result.full_text,
        ),
        processing_time_ms=elapsed_ms,
    )
