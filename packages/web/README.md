# cash-kitty-web

レシートを撮影 → OCR 解析 → Google Drive のアプリ専用領域に保存し、月ごとの統計を表示する SPA です\
スマホでの利用を前提にしています

- **取り込み** タブ: カメラで撮影 / 画像選択 → OCR で解析 → 内容を編集して保存
- **統計** タブ: 月別の合計・カテゴリ別内訳・明細（タップで詳細 → 画像表示・編集・削除）
- **設定** タブ: Google Drive 接続（Google クライアント ID は `.env` の `BUN_PUBLIC_GOOGLE_CLIENT_ID` で設定）

データは閲覧者自身の Google Drive の `appDataFolder`（アプリ専用の隠し領域）に、レシート 1 件＝ JSON 1 ファイル（`receipt-<id>.json`）＋画像ファイル（`image-<id>`）として保存されます\
アプリサーバーには一切送信・保存されません

OCR API へは**ブラウザが直接アクセス**します（接続先は `BUN_PUBLIC_OCR_API_URL`）。Web サーバはプロキシも設定 API（`/api/*`）も持たず、SPA と PWA 資産を配信するだけです\
そのため OCR は接続先が到達可能なとき（ローカル API を起動している／トンネルが開いている）だけ動作します。OCR API 側は配信元オリジンを CORS で許可してください（既定は開発用の `http://localhost:3000`。本番は API の `.env` の `CORS_ALLOW_ORIGINS` に配信オリジンを設定）

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

## 静的サイトとしてビルド / 配信

本番は **ビルド済みの静的ファイル** を配信します。`bun run build` で `dist/` に HTML・ハッシュ付き JS/CSS・PWA 資産が出力され、任意の静的ホスト（Cloudflare Pages / Netlify / Vercel など、**サイトのルート**で配信）にそのまま置けます。

```bash
bun run build   # → dist/ を生成（NODE_ENV=production、設定を埋め込み）
bun run start   # build してから dist/ をローカルで静的配信（本番プレビュー / PWA 確認）
```

`bun dev` だけが TS/CSS をオンザフライでバンドルする開発サーバー（HMR 付き、[src/index.ts](src/index.ts)）です。`bun start` は本番ビルドを作って [serve.ts](serve.ts) で `dist/` をそのまま配るだけ — 実際の静的ホストと同じ挙動で、API もプロキシもありません（OCR を試すなら `bun dev` を使ってください）。

### Cloudflare Pages で `packages/web` だけ配信する

Cloudflare Pages には **`packages/web` だけ**をデプロイできます。Bun の静的ビルドだけで完結するため、Functions は不要です。

- Root directory: `packages/web`
- Build command: `bun run build`
- Build output directory: `dist`
- Production branch: 任意（例 `main`）

Pages では `BUN_PUBLIC_*` を**ビルド環境変数**として設定します。

- `BUN_PUBLIC_GOOGLE_CLIENT_ID`: 必須。Google OAuth の Web クライアント ID
- `BUN_PUBLIC_OCR_API_URL`: 必須。OCR API の HTTPS URL（例: `https://cash-api.example.com`）

例:

```text
BUN_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
BUN_PUBLIC_OCR_API_URL=https://ocr-api.example.com
```

`packages/web` を単体で配信する構成では、`BUN_PUBLIC_OCR_API_URL` を未設定にしないでください。未設定だと `/api/...` を叩くため、OCR が失敗します。

`public/_redirects` と `public/_headers` はビルド時に `dist/` へコピーされます。これにより Cloudflare Pages 上でも、SPA の直接アクセス時に `index.html` へフォールバックし、`manifest.webmanifest` は再検証付きで配信されます。

`public/_headers` には全ルート向けのセキュリティヘッダ（`X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Cross-Origin-Opener-Policy` / `Strict-Transport-Security` / `Permissions-Policy`）を定義しています。`Content-Security-Policy` は静的に書かず、`build.ts` が `dist/_headers` の `/*` ブロックへ**ビルド時に注入**します（`connect-src` に `BUN_PUBLIC_OCR_API_URL` のオリジンを含める必要があり、またインライン `<script>` を `'unsafe-inline'` なしで許可するため各スクリプトの SHA-256 ハッシュを算出するため）。Google Identity Services は公式ガイダンスに従い `https://accounts.google.com/gsi/*` のみ許可しています。OCR API を別オリジンに置く場合は、その HTTPS オリジンが自動で `connect-src` に入ります。`bun start`（[serve.ts](serve.ts)）はローカル確認用に CSP 以外の同等ヘッダを付与します（HSTS は https 専用のため、CSP は生成物のため除外）。

|                             | `bun dev`（開発）                                 | `bun start` / 本番ホスト                                  |
| --------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| ファイル配信                | オンザフライでバンドル + HMR                      | ビルド済み `dist/` を静的配信                             |
| 設定・OCR 接続先            | `BUN_PUBLIC_*`（`.env`、`http://localhost:8000`） | `BUN_PUBLIC_*`（ホストの環境変数、`https://cash-api...`） |
| OCR / Drive / 統計 / 手入力 | ブラウザ側で完結                                  | ブラウザ側で完結                                          |

### 設定の埋め込み（`BUN_PUBLIC_*`）

設定はビルド時にバンドルへ焼き込みます（Google クライアント ID は公開前提の値なので埋め込んで問題ありません）。

- `.env`（開発・git 管理外）: 開発時は web(:3000) と API(:8000) が別オリジンなので API を直接指す

  ```bash
  BUN_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
  BUN_PUBLIC_OCR_API_URL=http://localhost:8000
  ```

- 本番（Cloudflare Pages など）: ダッシュボードの Build environment variables で設定

  ```bash
  BUN_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
  BUN_PUBLIC_OCR_API_URL=https://cash-api.example.com
  ```

  ※ `BUN_PUBLIC_OCR_API_URL` はブラウザから到達できる HTTPS URL を設定してください。

> 配信先 URL は Google の **承認済み JavaScript 生成元** に登録してください。OCR を別オリジンから呼ぶ場合は、API 側 `.env` の `CORS_ALLOW_ORIGINS` にその配信オリジン（固定 HTTPS URL）を設定してください（既定は開発用の `http://localhost:3000`）。

## PWA（ホーム画面に追加）

このアプリは「ホーム画面に追加」でき、ネイティブアプリのように全画面（アドレスバーなし）で起動できます。マニフェストとアイコン、iOS 用の起動画像で実現しており、**Service Worker は使っていません**。

- OCR・Google Drive はどちらも常にネットワークを使うため、このアプリはオフラインでは何もできません。そのため「オフライン用 app-shell」を提供する Service Worker は廃止しました（白画面リスクと保守コストだけが残るため）。以前のバージョンを開いていた端末では、次回アクセス時に [frontend.tsx](src/frontend.tsx) が登録済み SW とキャッシュを自動で解除します
- マニフェスト・アイコンは `public/` にあり、ルート直下（`/manifest.webmanifest`、`/icon-*.png`）で配信されます（サーバー配信時は Bun サーバー、静的配信時は `bun run build` が `dist/` にコピー）
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
   - スマホ用: 下記の Cloudflare Tunnel で発行する公開 URL（例 `https://cashkitty.example.com`）
6. **承認済みのリダイレクト URI** にも同じ URL を追加（末尾 `/` まで一致が必要。例 `http://localhost:3000/`、`https://cashkitty.example.com/`）
   - 認証はポップアップではなく **ページ全体のリダイレクト**で行うため、JavaScript 生成元だけでは動きません
7. 発行された **クライアント ID**（`xxxx.apps.googleusercontent.com`）を `.env` の `BUN_PUBLIC_GOOGLE_CLIENT_ID` に設定

### 3. `.env` で設定を一元管理

`.env.example` を `.env` にコピーし、値を埋めます。`.env` を変更したら `bun dev` を再起動してください。

## スマホから Google Drive に保存する（Cloudflare 名前付きトンネル）

Google の OAuth は **セキュアコンテキスト（HTTPS か `localhost`）でしか動きません**。スマホから `http://<LAN IP>:3000`（HTTP）で開くと Drive 保存に失敗します。そこで [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) で、ローカルの `http://localhost:3000` を **自分の Cloudflare 管理ドメイン上の固定 HTTPS URL** として公開します（証明書は Cloudflare 側が用意するため、スマホへの証明書インストールは不要）。

前提: Cloudflare アカウントと、Cloudflare で管理しているドメイン（例 `example.com`）。

### ダッシュボードで設定する（推奨・CLI 設定不要）

ルーティングや公開ホスト名はすべて [Zero Trust ダッシュボード](https://one.dash.cloudflare.com/) で管理され、PC 側はコネクタを常駐させるだけです（`config.yml` 不要）。

1. ダッシュボード → **Networks → Tunnels → Create a tunnel** → **Cloudflared** を選択
2. 名前（例 `cash-kitty`）を付けて保存
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
   - Subdomain: `cashkitty`（任意）／ Domain: 自分のドメイン
   - Service: Type = **HTTP**、URL = `localhost:3000`
   - 保存（DNS レコードは自動作成）
6. ローカルで `bun dev` を起動（`localhost:3000`）
7. `https://cashkitty.example.com` を Google の **承認済み JavaScript 生成元** に登録（一度きり。URL は固定）
8. スマホのブラウザで `https://cashkitty.example.com` を開く → Drive 接続・保存が動作します

> OCR をスマホからも使う場合は、ブラウザが OCR API を直接呼ぶため `BUN_PUBLIC_OCR_API_URL` を **スマホから到達できる URL**（例: トンネルで公開した OCR API、または Bun サーバーと同じトンネル URL）にして起動 / ビルドしてください。`http://localhost:8000` のままだと「localhost = スマホ自身」になり OCR は失敗します（PC 上で開いたときのみ動作）。

公開ホスト名やサービス先（`localhost:3000`）を後から変えたいときも、ダッシュボードの該当トンネルの **Public Hostname** を編集するだけです。

> 代わりに CLI（`cloudflared login` → `tunnel create` → `tunnel route dns` → `config.yml` → `tunnel run`）でも設定できます。トンネルは外部（Cloudflare）を経由します。Cloudflare Tunnel 自体は無料プランで利用できます（ドメインの登録費用は別途）。
