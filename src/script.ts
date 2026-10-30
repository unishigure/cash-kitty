function getRequiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

const form = getRequiredElement<HTMLFormElement>("#analysis-form");
const inputs = getRequiredElement<HTMLFieldSetElement>("#inputs");
const imageInput = getRequiredElement<HTMLInputElement>("#image");
const preview = getRequiredElement<HTMLImageElement>("#preview");
const promptInput = getRequiredElement<HTMLTextAreaElement>("#prompt");
const analyze = getRequiredElement<HTMLButtonElement>("#analyze");
const status = getRequiredElement<HTMLParagraphElement>("#status");
const result = getRequiredElement<HTMLPreElement>("#result");
const timing = getRequiredElement<HTMLParagraphElement>("#timing");

const modelOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: "text", languages: ["ja"] }, { type: "image" }],
  expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

let previewUrl: string | undefined;
let imageReady = false;

function showError(error: unknown) {
  console.error(error);
  status.textContent = `エラー: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
}

imageInput.addEventListener("change", () => {
  imageReady = false;
  analyze.disabled = true;
  preview.hidden = true;
  preview.removeAttribute("src");
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
  }
  result.textContent = "まだ解析していません。";
  timing.textContent = "";

  const file = imageInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    status.textContent = "エラー: 画像ファイルを選択してください。";
    return;
  }

  status.textContent = "画像を読み込み中…";
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
});

preview.addEventListener("load", () => {
  imageReady = true;
  preview.hidden = false;
  analyze.disabled = false;
  status.textContent = "画像を読み込みました。解析できます。";
});

preview.addEventListener("error", () => {
  imageReady = false;
  analyze.disabled = true;
  preview.hidden = true;
  status.textContent =
    "エラー: 画像を読み込めません。別の画像を選択してください。";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = imageInput.files?.[0];
  const prompt = promptInput.value.trim();
  if (inputs.disabled) return;
  if (!file || !imageReady || !prompt) {
    status.textContent = "エラー: 読み込める画像と解析指示を指定してください。";
    return;
  }

  inputs.disabled = true;
  result.textContent = "";
  timing.textContent = "";
  status.textContent = "モデルを準備中（初回はダウンロードが必要です）…";
  let session: LanguageModel | undefined;

  try {
    session = await LanguageModel.create({
      ...modelOptions,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          status.textContent = `モデルをダウンロード中: ${Math.round(event.loaded * 100)}%`;
        });
      },
    });
    status.textContent = "端末内で画像を解析中…";
    const started = performance.now();
    const response = await session.prompt(
      [
        {
          role: "user",
          content: [
            { type: "text", value: prompt },
            { type: "image", value: file },
          ],
        },
      ],
      {
        responseConstraint: {
          type: "object",
          properties: {
            shop_name: { type: "string" },
            total: { type: "integer", minimum: 0 },
            date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
          required: ["total"],
          additionalProperties: false,
        },
      },
    );
    if (!response.trim()) {
      throw new Error("モデルから空の結果が返されました。");
    }
    result.textContent = response;
    timing.textContent = `解析時間: ${((performance.now() - started) / 1000).toFixed(2)} 秒（モデル準備時間を除く）`;
    status.textContent = "解析が完了しました。";
  } catch (error) {
    result.textContent = "解析結果はありません。";
    showError(error);
  } finally {
    session?.destroy();
    inputs.disabled = false;
  }
});

async function checkAvailability() {
  if (!isSecureContext || typeof LanguageModel === "undefined") {
    status.textContent =
      "この環境では Prompt API を利用できません。対応するデスクトップ版 Chrome で開いてください。";
    return;
  }

  try {
    const availability = await LanguageModel.availability(modelOptions);
    if (availability === "unavailable") {
      status.textContent =
        "この環境では画像入力・日本語出力を利用できません。Chrome の対応状況・モデル・ハードウェア要件を確認してください。";
      return;
    }
    inputs.disabled = false;
    status.textContent =
      availability === "available"
        ? "モデルは利用可能です。画像を選択してください。"
        : "画像を選択して解析すると、モデルのダウンロードを開始または待機します。";
  } catch (error) {
    showError(error);
  }
}

await checkAvailability();
