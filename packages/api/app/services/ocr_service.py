from __future__ import annotations

from dataclasses import dataclass
import datetime
import io
import re
import threading
from typing import Any

import cv2
import numpy as np
import pillow_heif
from PIL import Image
from yomitoku import DocumentAnalyzer

pillow_heif.register_heif_opener()

# Cap the decoded image size to defend against decompression bombs: a small
# compressed file (notably PNG) can expand to an enormous pixel buffer and
# exhaust memory. ~40 MP decoded as BGR is ~120 MB and covers any real
# phone-camera receipt photo with wide margin (the web client downscales to
# 2000 px before upload, so legitimate uploads are far smaller).
MAX_IMAGE_PIXELS = 40_000_000

# Make PIL raise instead of merely warning once an image exceeds the cap (the
# header probe below already rejects oversized images; this guards the HEIC
# fallback path, which fully decodes via PIL).
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


@dataclass
class OCRResult:
    store_name: str
    total_amount: int | None
    date: str | None
    full_text: str


class OCRService:
    def __init__(self, device: str = "cuda", visualize: bool = False) -> None:
        self._device = device
        self._visualize = visualize
        self._analyzer: DocumentAnalyzer | None = None
        self._lock = threading.Lock()

    @property
    def device(self) -> str:
        return self._device

    def _get_analyzer(self) -> DocumentAnalyzer:
        if self._analyzer is None:
            with self._lock:
                if self._analyzer is None:
                    self._analyzer = DocumentAnalyzer(
                        visualize=self._visualize,
                        device=self._device,
                    )
        return self._analyzer

    def analyze_image_bytes(self, content: bytes) -> OCRResult:
        image = self._decode_image(content)
        analyzer = self._get_analyzer()
        results, _ocr_vis, _layout_vis = analyzer(image)

        paragraphs = [
            self._paragraph_to_dict(p) for p in getattr(results, "paragraphs", [])
        ]
        full_text = "\n".join(
            [p.get("contents", "") for p in paragraphs if p.get("contents")]
        )
        store_name = self._extract_store_name(paragraphs)
        total_amount = self._extract_total_amount(full_text)
        date = self._extract_date(full_text)

        return OCRResult(
            store_name=store_name,
            total_amount=total_amount,
            date=date,
            full_text=full_text,
        )

    @staticmethod
    def _decode_image(content: bytes) -> np.ndarray:
        # Defend against decompression bombs: inspect the image header (cheap,
        # no full pixel decode) and reject anything whose declared dimensions
        # would expand to an oversized buffer *before* we allocate one. All
        # accepted formats (jpeg/png/webp/heic/heif) are readable by PIL.
        try:
            with Image.open(io.BytesIO(content)) as probe:
                width, height = probe.size
        except Exception:
            raise ValueError("Failed to decode image bytes")

        if width <= 0 or height <= 0:
            raise ValueError("Failed to decode image bytes")
        if width * height > MAX_IMAGE_PIXELS:
            raise ValueError(
                f"Image is too large to process ({width}x{height} px). "
                f"Maximum is {MAX_IMAGE_PIXELS} pixels."
            )

        np_buffer = np.frombuffer(content, dtype=np.uint8)
        image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if image is not None:
            return image

        # Fallback for formats not supported by OpenCV (e.g. HEIC/HEIF)
        try:
            pil_image = Image.open(io.BytesIO(content)).convert("RGB")
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            return image
        except Exception:
            pass

        raise ValueError("Failed to decode image bytes")

    @staticmethod
    def _paragraph_to_dict(paragraph: Any) -> dict[str, Any]:
        return {
            "box": [int(v) for v in list(getattr(paragraph, "box", []))],
            "direction": getattr(paragraph, "direction", None),
            "order": getattr(paragraph, "order", None),
            "role": getattr(paragraph, "role", None),
            "contents": str(getattr(paragraph, "contents", "")),
        }

    @staticmethod
    def _extract_store_name(paragraphs: list[dict[str, Any]]) -> str:
        heading = next(
            (
                p.get("contents", "").strip()
                for p in paragraphs
                if p.get("role") == "section_headings" and p.get("contents", "").strip()
            ),
            "",
        )
        if heading:
            return heading

        first_line = next(
            (
                p.get("contents", "").strip()
                for p in paragraphs
                if p.get("contents", "").strip()
            ),
            "",
        )
        return first_line

    @staticmethod
    def _extract_total_amount(full_text: str) -> int | None:
        normalized = full_text.replace("\u3000", " ")
        compact = re.sub(r"\s+", "", normalized)

        candidates = [
            r"(?:合計|合計金額|ご請求額|お支払(?:金額)?|お会計)[:：]?¥?([0-9,]+)",
            r"(?:合計|合計金額|ご請求額|お支払(?:金額)?|お会計)[^0-9]{0,10}([0-9,]+)",
        ]

        for pattern in candidates:
            match = re.search(pattern, compact)
            if not match:
                continue
            amount_text = match.group(1).replace(",", "")
            if amount_text.isdigit():
                return int(amount_text)

        return None

    # Japanese era start years (era_year 1 == these Gregorian years).
    _ERA_BASE = {"令和": 2019, "平成": 1989, "昭和": 1926}

    @classmethod
    def _extract_date(cls, full_text: str) -> str | None:
        """Best-effort extraction of the purchase date as ISO ``YYYY-MM-DD``.

        Handles common Japanese receipt formats:
        ``2026年6月5日`` / ``2026/6/5`` / ``2026-06-05`` / ``2026.6.5`` and
        Japanese-era forms such as ``令和6年6月5日`` / ``R6.6.5``.
        Returns the first plausible date found, or ``None``.
        """
        text = re.sub(r"\s+", "", full_text.replace("　", " "))

        candidates: list[tuple[int, int, int]] = []

        # Japanese era (kanji), e.g. 令和6年6月5日
        for era, base in cls._ERA_BASE.items():
            for m in re.finditer(
                rf"{era}(\d{{1,2}})年(\d{{1,2}})月(\d{{1,2}})日?", text
            ):
                candidates.append(
                    (base + int(m.group(1)) - 1, int(m.group(2)), int(m.group(3)))
                )

        # Japanese era (initial), e.g. R6.6.5 / H31/4/30
        era_initials = {"R": 2019, "H": 1989, "S": 1926}
        for m in re.finditer(
            r"(?<![A-Za-z])([RHS])(\d{1,2})[./\-](\d{1,2})[./\-](\d{1,2})", text
        ):
            base = era_initials[m.group(1).upper()]
            candidates.append(
                (base + int(m.group(2)) - 1, int(m.group(3)), int(m.group(4)))
            )

        # Western 4-digit year, e.g. 2026年6月5日 / 2026/6/5 / 2026-06-05
        for m in re.finditer(
            r"(19\d{2}|20\d{2})[年/.\-](\d{1,2})[月/.\-](\d{1,2})日?", text
        ):
            candidates.append((int(m.group(1)), int(m.group(2)), int(m.group(3))))

        # 2-digit year (assume 2000s), e.g. 26/06/05 — lowest priority
        for m in re.finditer(r"(?<!\d)(\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})", text):
            candidates.append((2000 + int(m.group(1)), int(m.group(2)), int(m.group(3))))

        today = datetime.date.today()
        for year, month, day in candidates:
            try:
                d = datetime.date(year, month, day)
            except ValueError:
                continue
            # Reject implausible dates (far future / very old).
            if d.year < 2000 or d > today + datetime.timedelta(days=2):
                continue
            return d.isoformat()

        return None
