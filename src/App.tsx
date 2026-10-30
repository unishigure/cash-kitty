import "./style.css";
import { type ChangeEvent, type SubmitEvent, useEffect, useState } from "react";

const modelOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: "text", languages: ["ja"] }, { type: "image" }],
  expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

const responseConstraint = {
  type: "object",
  properties: {
    shop_name: { type: "string" },
    total: { type: "integer", minimum: 0 },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
  },
  required: ["total"],
  additionalProperties: false,
};

const initialResult = "まだ解析していません。";

function formatError(error: unknown) {
  console.error(error);
  return `エラー: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
}

export function App() {
  const [status, setStatus] = useState("画像入力の対応状況を確認中…");
  const [inputsDisabled, setInputsDisabled] = useState(true);
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [imageReady, setImageReady] = useState(false);
  const [prompt, setPrompt] = useState(
    "このレシートから合計金額を読み取ってください。",
  );
  const [result, setResult] = useState(initialResult);
  const [timing, setTiming] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkAvailability() {
      if (!isSecureContext || typeof LanguageModel === "undefined") {
        setStatus(
          "この環境では Prompt API を利用できません。対応するデスクトップ版 Chrome で開いてください。",
        );
        return;
      }

      try {
        const availability = await LanguageModel.availability(modelOptions);
        if (cancelled) return;
        if (availability === "unavailable") {
          setStatus(
            "この環境では画像入力・日本語出力を利用できません。Chrome の対応状況・モデル・ハードウェア要件を確認してください。",
          );
          return;
        }
        setInputsDisabled(false);
        setStatus(
          availability === "available"
            ? "モデルは利用可能です。画像を選択してください。"
            : "画像を選択して解析すると、モデルのダウンロードを開始または待機します。",
        );
      } catch (error) {
        if (!cancelled) setStatus(formatError(error));
      }
    }

    void checkAvailability();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImageReady(false);
    setPreviewUrl(undefined);
    setResult(initialResult);
    setTiming("");

    const selected = event.target.files?.[0];
    setFile(selected);
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setStatus("エラー: 画像ファイルを選択してください。");
      return;
    }

    setStatus("画像を読み込み中…");
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handlePreviewLoad() {
    setImageReady(true);
    setStatus("画像を読み込みました。解析できます。");
  }

  function handlePreviewError() {
    setImageReady(false);
    setStatus("エラー: 画像を読み込めません。別の画像を選択してください。");
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (inputsDisabled) return;
    if (!file || !imageReady || !trimmedPrompt) {
      setStatus("エラー: 読み込める画像と解析指示を指定してください。");
      return;
    }

    setInputsDisabled(true);
    setResult("");
    setTiming("");
    setStatus("モデルを準備中（初回はダウンロードが必要です）…");
    let session: LanguageModel | undefined;

    try {
      session = await LanguageModel.create({
        ...modelOptions,
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            setStatus(
              `モデルをダウンロード中: ${Math.round(event.loaded * 100)}%`,
            );
          });
        },
      });
      setStatus("端末内で画像を解析中…");
      const started = performance.now();
      const response = await session.prompt(
        [
          {
            role: "user",
            content: [
              { type: "text", value: trimmedPrompt },
              { type: "image", value: file },
            ],
          },
        ],
        { responseConstraint },
      );
      if (!response.trim()) {
        throw new Error("モデルから空の結果が返されました。");
      }
      setResult(response);
      setTiming(
        `解析時間: ${((performance.now() - started) / 1000).toFixed(2)} 秒（モデル準備時間を除く）`,
      );
      setStatus("解析が完了しました。");
    } catch (error) {
      setResult("解析結果はありません。");
      setStatus(formatError(error));
    } finally {
      session?.destroy();
      setInputsDisabled(false);
    }
  }

  return (
    <div className="mx-auto my-10 flex max-w-160 flex-col gap-4 px-4 font-sans leading-[1.6]">
      <h1 className="text-3xl font-bold">Gemini Nano 画像解析</h1>
      <p>
        画像は端末内で解析され、サーバーには送信されません。
        <br />
        初回はモデルのダウンロードが必要です。
      </p>
      <p role="status">{status}</p>
      <form onSubmit={handleSubmit}>
        <fieldset
          className="grid gap-3 border border-gray-400 p-4 disabled:opacity-60"
          disabled={inputsDisabled}
        >
          <legend className="px-1">解析する画像と指示</legend>
          <label htmlFor="image">画像</label>
          <input
            id="image"
            className="cursor-pointer disabled:cursor-not-allowed file:mr-3 file:cursor-pointer disabled:file:cursor-not-allowed file:border file:border-gray-400 file:bg-gray-100 file:px-3 file:py-1"
            type="file"
            accept="image/*"
            required
            onChange={handleImageChange}
          />
          {previewUrl && (
            <img
              className="max-h-80 max-w-full object-contain"
              src={previewUrl}
              alt="選択した画像のプレビュー"
              hidden={!imageReady}
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
            />
          )}
          <label htmlFor="prompt">解析指示</label>
          <textarea
            id="prompt"
            className="w-full resize-y border border-gray-400 p-2"
            rows={1}
            required
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button
            className="cursor-pointer justify-self-end border border-gray-400 bg-gray-100 px-4 py-2 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!imageReady}
          >
            解析する
          </button>
        </fieldset>
      </form>
      <h2 className="text-2xl font-bold">解析結果</h2>
      <p>{timing}</p>
      <pre
        className="bg-gray-100 p-4 whitespace-pre-wrap wrap-anywhere"
        aria-live="polite"
      >
        {result}
      </pre>
    </div>
  );
}

export default App;
