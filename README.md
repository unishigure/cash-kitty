# cash-kitty-2

Chrome のオンデバイス Gemini Nano（Prompt API）で画像解析を検証する。

## 起動方法

```sh
bun install
bun run dev
```

対応するデスクトップ版 Chrome で <http://localhost:3000> を開く。

## 動作条件

- Prompt API の画像入力と日本語入出力に対応した Chrome と端末を用意する。
- localhost または HTTPS でアクセスする。
- 初回は Chrome がモデルをダウンロードするため、画面で進捗を確認する。
- 未対応・利用不可・解析失敗を画面に表示し、クラウド API への代替送信を行わない。
- 選択した画像をローカルでプレビューし、ブラウザー内のモデルへ直接渡す。\
  アプリのサーバーへのアップロードや保存は行わない。
- 解析ごとに新しいセッションを作成し、前回の画像や指示を引き継がない。

モデルの状態は `chrome://on-device-internals` で確認する。

## 参考

- [Prompt API  |  AI in Chrome  |  Chrome for Developers](https://developer.chrome.com/docs/ai/prompt-api)
