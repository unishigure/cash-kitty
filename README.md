# Cash Kitty

レシート情報を読み取り、出費を可視化するシンプル家計簿アプリ

Powered by [YomiToku](https://github.com/kotaro-kinoshita/yomitoku)

## Packages

| パッケージ | 役割 | スタック |
| --- | --- | --- |
| [`packages/api`](packages/api/README.md) | レシート OCR API | Python / FastAPI / yomitoku |
| [`packages/web`](packages/web/README.md) | レシート家計簿 SPA（スマホ前提） | Bun / React / Tailwind |

OCR の解析は `api`、撮影・統計・Google Drive 保存は `web` が担当します。\
データはユーザー自身の Google Drive の `appDataFolder` にのみ保存され、アプリサーバーには残りません。
