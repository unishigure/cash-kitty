from pydantic import BaseModel, Field


class OCRData(BaseModel):
    store_name: str = ""
    total_amount: int | None = None
    # Purchase date as ISO `YYYY-MM-DD`, or None if not detected.
    date: str | None = None
    full_text: str = ""


class AnalyzeResponse(BaseModel):
    success: bool = True
    data: OCRData
    processing_time_ms: int
    warnings: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    device: str


class ErrorResponse(BaseModel):
    success: bool = False
    code: str
    message: str
