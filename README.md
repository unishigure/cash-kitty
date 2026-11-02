# Cash Kitty

レシート情報を読み取り、出費を可視化するシンプル家計簿アプリ

## 起動方法

```sh
bun install
bun run dev
```

オンデバイス AI による自動レシート読み取り機能には、対応する Chrome が必要

## Google Drive 連携

設定画面から Google Drive に接続すると、明細とレシート画像を Drive のアプリ専用領域（`appDataFolder`）に保存し、端末間で同期\
保存形式は旧版と同じ（明細 1 件 = `receipt-<YYYY-MM>-<id>.json`、画像 = `image-<id>`）で、旧版と同じクライアント ID なら旧版のデータをそのまま読み込み可能

`.env.example` を `.env` にコピーし、Google OAuth のウェブクライアント ID を設定

```sh
BUN_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

認証はページ全体のリダイレクトで行うため、アプリの URL（例: `http://localhost:3000/`）を OAuth クライアントの「承認済みの JavaScript 生成元」と「承認済みのリダイレクト URI」の両方に登録が必要
