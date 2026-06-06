# cash-kitty-api

`yomitoku` を使ったレシート OCR API です。

## Setup

```powershell
cd packages/api
uv sync
```

## Run

```powershell
cd packages/api
uv run main.py
```

Server: `http://localhost:8000`

## Environment Variables

- `APP_NAME` (default: `cash-kitty-api`)
- `APP_VERSION` (default: `0.1.0`)
- `OCR_DEVICE` (default: `cuda`)
- `MAX_UPLOAD_SIZE_BYTES` (default: `10485760`)

## API

### `GET /api/health`

Health check

### `POST /api/ocr/analyze`

`multipart/form-data` の `image` を受け取り、OCR 結果を返します。

返却データ:

- `data.store_name`: 店名（推定）
- `data.total_amount`: 合計金額（整数、抽出できない場合は `null`）
- `data.date`: 日付（`YYYY-MM-DD`、抽出できない場合は `null`）
- `data.full_text`: OCR 全文

対応 MIME:

- `image/jpeg`
- `image/png`
- `image/webp`

#### Example

```powershell
curl -X POST "http://localhost:8000/api/ocr/analyze" `
-H "accept: application/json" `
-H "Content-Type: multipart/form-data" `
-F "image=@C:\path\to\receipt.jpg"
```

レスポンス例:

```json
{
 "success": true,
 "data": {
  "store_name": "AEON STYLE",
  "total_amount": 4251,
  "date": "2026-06-05",
  "full_text": "..."
 },
 "processing_time_ms": 10366,
 "warnings": []
}
```
