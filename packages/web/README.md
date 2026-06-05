# money-note-web

レシートを撮影 → OCR 解析 → Google Drive のアプリ専用領域に保存し、月ごとの統計を表示する SPA です\
スマホでの利用を前提にしています

- **取り込み** タブ: カメラで撮影 / 画像選択 → OCR で解析 → 内容を編集して保存
- **統計** タブ: 月別の合計・カテゴリ別内訳・明細（タップで詳細 → 画像表示・編集・削除）
- **設定** タブ: Google Drive 接続（Google クライアント ID は `.env` で設定）

データは閲覧者自身の Google Drive の `appDataFolder`（アプリ専用の隠し領域）に、レシート 1 件＝ JSON 1 ファイル（`receipt-<id>.json`）＋画像ファイル（`image-<id>`）として保存されます\
アプリサーバーには一切送信・保存されません（OCR は下記のとおりプロキシ経由で解析するだけ）

OCR API へはブラウザから直接アクセスせず、**Web サーバが `/api/ocr/*` をプロキシ**します\
これにより SPA は常に同一オリジンで通信でき、HTTPS 配信時の混在コンテンツや CORS を回避できます

## Setup

```bash
bun install
```

## 開発サーバー

```bash
bun dev
```

既定では `http://localhost:3000` で起動します\
スマホから使う場合は同じ LAN 上の PC の IP（例: `http://192.168.x.x:3000`）にアクセスします

## 本番モードで配信

```bash
bun start   # NODE_ENV=production で起動（HMR 無効・Service Worker 有効）
```

`bun start` は `src/index.ts` を直接起動し、Bun が HTML/TS/CSS をリクエスト時にバンドルして配信します（事前ビルド不要）。

## PWA（ホーム画面に追加 / オフライン）

このアプリは PWA です。スマホのブラウザで開くと「ホーム画面に追加」でき、ネイティブアプリのように起動できます（アドレスバーなしの全画面）。

- マニフェスト・アイコン・Service Worker は `public/` にあり、サーバーがルート直下（`/manifest.webmanifest`、`/sw.js`、`/icon-*.png`）で配信します
- Service Worker は **本番モードでのみ登録**されます（`bun dev` では HMR と競合するため無効）。インストール可能な PWA として確認するときは `bun start`（必要なら Cloudflare Tunnel 経由）で開いてください
- オフライン時はアプリのシェル（画面）を表示します。OCR・Google Drive・`/api/*` は常にネットワークを使うため、保存や解析にはオンライン接続が必要です
- アイコンを差し替えるときは `public/` の各 PNG を入れ替えてください（`icon-192` / `icon-512` / `icon-maskable-512` / `apple-touch-icon` / `favicon-32`）

## 必要な外部設定

### 1. OCR API（`packages/api`）を起動

別ターミナルで:

```bash
cd ../api
uv run main.py   # http://0.0.0.0:8000
```

### 2. Google OAuth クライアント ID を作成

Google Drive へ保存するため、Google Cloud Console で OAuth クライアント ID が必要です

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「API とサービス」→「ライブラリ」で **Google Drive API** を有効化
3. 「OAuth 同意画面」を構成（外部 / テスト で可。テストユーザーに自分の Google アカウントを追加）
   - スコープは `.../auth/drive.appdata` のみで十分です
4. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」→ アプリの種類 **ウェブアプリケーション**
5. **承認済みの JavaScript 生成元** に、このアプリを開く URL を追加
   - PC 用: `http://localhost:3000`
   - スマホ用: 下記の Cloudflare Tunnel で発行する公開 URL（例 `https://moneynote.example.com`）
6. 発行された **クライアント ID**（`xxxx.apps.googleusercontent.com`）を `.env` の `GOOGLE_CLIENT_ID` に設定

### 3. `.env` で設定を一元管理

`.env.example` を `.env` にコピーし、値を埋めます。`.env` を変更したら `bun dev` を再起動してください。

## スマホから Google Drive に保存する（Cloudflare 名前付きトンネル）

Google の OAuth は **セキュアコンテキスト（HTTPS か `localhost`）でしか動きません**。スマホから `http://<LAN IP>:3000`（HTTP）で開くと Drive 保存に失敗します。そこで [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) で、ローカルの `http://localhost:3000` を **自分の Cloudflare 管理ドメイン上の固定 HTTPS URL** として公開します（証明書は Cloudflare 側が用意するため、スマホへの証明書インストールは不要）。

前提: Cloudflare アカウントと、Cloudflare で管理しているドメイン（例 `example.com`）。

### ダッシュボードで設定する（推奨・CLI 設定不要）

ルーティングや公開ホスト名はすべて [Zero Trust ダッシュボード](https://one.dash.cloudflare.com/) で管理され、PC 側はコネクタを常駐させるだけです（`config.yml` 不要）。

1. ダッシュボード → **Networks → Tunnels → Create a tunnel** → **Cloudflared** を選択
2. 名前（例 `money-note`）を付けて保存
3. 表示される「コネクタのインストール」画面で OS = **Windows** を選択。cloudflared 未導入なら先に入れる:

   ```powershell
   winget install Cloudflare.cloudflared
   ```

   そのうえで、画面に表示される **トークン付きコマンド**を管理者 PowerShell で実行（Windows サービスとして常駐）:

   ```powershell
   cloudflared.exe service install <ダッシュボードが表示するトークン>
   ```

4. コネクタが **Connected** になったら次へ
5. **Public Hostname** タブ → **Add a public hostname**
   - Subdomain: `moneynote`（任意）／ Domain: 自分のドメイン
   - Service: Type = **HTTP**、URL = `localhost:3000`
   - 保存（DNS レコードは自動作成）
6. ローカルで `bun dev` を起動（`localhost:3000`）
7. `https://moneynote.example.com` を Google の **承認済み JavaScript 生成元** に登録（一度きり。URL は固定）
8. スマホのブラウザで `https://moneynote.example.com` を開く → Drive 接続・保存・OCR がすべて動作します

公開ホスト名やサービス先（`localhost:3000`）を後から変えたいときも、ダッシュボードの該当トンネルの **Public Hostname** を編集するだけです。

> 代わりに CLI（`cloudflared login` → `tunnel create` → `tunnel route dns` → `config.yml` → `tunnel run`）でも設定できます。トンネルは外部（Cloudflare）を経由します。Cloudflare Tunnel 自体は無料プランで利用できます（ドメインの登録費用は別途）。
