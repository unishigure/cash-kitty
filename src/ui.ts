export function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function formatError(error: unknown) {
  console.error(error);
  return `エラー: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
}

export function formatYen(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

export const inputClass = "w-full border border-gray-400 p-2";
export const buttonClass =
  "cursor-pointer border border-gray-400 bg-gray-100 px-4 py-2 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50";
