# Cash Kitty

レシート情報を読み取り、出費を可視化するシンプル家計簿アプリ

## 起動方法

```sh
bun install
bun run dev
```

オンデバイス AI による自動レシート読み取り機能には、対応する Chrome が必要

## Google Drive 連携

設定画面から接続すると、明細とレシート画像を Google Drive に保存して端末間で同期\
保存先は Drive のアプリ専用領域（`appDataFolder`）

`.env.example` を `.env` にコピーし、Google OAuth のクライアント ID を設定

```sh
BUN_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

アプリの URL（例: `http://localhost:3000/`）を、OAuth クライアントの次の 2 か所に登録

- 承認済みの JavaScript 生成元
- 承認済みのリダイレクト URI

## スプラッシュ画像

以下を変更した場合、iOS の起動画面を再生成する

> [!WARNING]
> 実行環境に Chrome が必要

- `public/icon-512.png`
- manifest の `background_color`

```sh
bun run splash
```
