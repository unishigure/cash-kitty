# Cash Kitty

レシート情報を読み取り、出費を可視化するシンプル家計簿アプリ

## Flow

基本クライアントにて処理を完結\
アプリサーバーへの送信・保存なし

1. レシート画像を読み込む
2. OCR で 店舗名/合計金額 を読み取る
3. ユーザの Google Drive の App 領域（appDataFolder）に JSON 形式で保存
4. 月ごとの統計を表示

日本語 Document AI: <https://github.com/kotaro-kinoshita/yomitoku>

## Packages

| パッケージ | 役割 | スタック |
| --- | --- | --- |
| [`packages/api`](packages/api/README.md) | レシート OCR API | Python / FastAPI / yomitoku |
| [`packages/web`](packages/web/README.md) | レシート家計簿 SPA（スマホ前提） | Bun / React / Tailwind |

OCR の解析は `api`、撮影・統計・Google Drive 保存は `web` が担当します。データはユーザー自身の Google Drive の `appDataFolder` にのみ保存され、アプリサーバーには残りません。

## Quick Start

```bash
# 1. OCR API
cd packages/api
uv sync
uv run main.py            # http://localhost:8000

# 2. Web (別ターミナル)
cd packages/web
bun install
bun dev                   # http://localhost:3000
```
