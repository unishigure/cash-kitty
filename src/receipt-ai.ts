import { type Category, categories } from "./receipt";

export const modelOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: "text", languages: ["ja"] }, { type: "image" }],
  expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

const responseConstraint = {
  type: "object",
  properties: {
    storeName: { type: "string" },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    totalAmount: { type: "integer", minimum: 0 },
    category: { type: "string", enum: categories },
  },
  required: ["storeName", "date", "totalAmount", "category"],
  additionalProperties: false,
};

export type ExtractedReceipt = {
  storeName: string;
  date: string;
  totalAmount: number;
  category: Category;
};

export async function checkModelAvailability(): Promise<
  Availability | "unsupported"
> {
  if (!isSecureContext || typeof LanguageModel === "undefined") {
    return "unsupported";
  }
  return LanguageModel.availability(modelOptions);
}

export async function extractReceipt(
  image: File,
  onDownloadProgress: (ratio: number) => void,
): Promise<ExtractedReceipt> {
  const session = await LanguageModel.create({
    ...modelOptions,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) => {
        onDownloadProgress(event.loaded);
      });
    },
  });

  try {
    const instruction = [
      "このレシート画像から次の項目を読み取ってください。",
      "- storeName: 店舗名",
      `- date: 購入日（YYYY-MM-DD）。年が読み取れない場合は ${new Date().getFullYear()} 年とする`,
      "- totalAmount: 税込の合計金額（円、整数）",
      `- category: 支出の分類。${categories.join("、")} のいずれか`,
    ].join("\n");
    const response = await session.prompt(
      [
        {
          role: "user",
          content: [
            { type: "text", value: instruction },
            { type: "image", value: image },
          ],
        },
      ],
      { responseConstraint },
    );
    return JSON.parse(response) as ExtractedReceipt;
  } finally {
    session.destroy();
  }
}
