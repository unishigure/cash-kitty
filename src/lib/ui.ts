export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function formatYen(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

export type Status = {
  tone: "neutral" | "info" | "success" | "error";
  text: string;
};

export function errorStatus(error: unknown): Status {
  console.error(error);
  return {
    tone: "error",
    text:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
  };
}

export const cardClass =
  "rounded-12 border border-solid-gray-420 bg-white p-4 md:p-6";

export const inputClass =
  "min-h-12 w-full rounded-8 border border-solid-gray-600 bg-white px-4 py-2 text-std-16N-170 text-solid-gray-800 hover:border-black";

const buttonBaseClass =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-8 py-2 text-oln-16B-100 underline-offset-[3px] enabled:hover:underline disabled:cursor-not-allowed";

export const primaryButtonClass = `${buttonBaseClass} px-4 border-4 border-double border-transparent bg-key-900 text-white enabled:hover:bg-key-1000 enabled:active:bg-key-1200 disabled:bg-solid-gray-300 disabled:text-solid-gray-50`;
const outlineButtonClass = `${buttonBaseClass} border border-current bg-white text-key-900 enabled:hover:bg-key-200 enabled:hover:text-key-1000 enabled:active:bg-key-300 enabled:active:text-key-1200 disabled:text-solid-gray-300`;
export const buttonClass = `${outlineButtonClass} px-4`;
export const dangerButtonClass = `${buttonBaseClass} px-4 border border-current bg-white text-error-2 enabled:hover:bg-red-50 enabled:hover:text-red-1000 enabled:active:bg-red-100 disabled:text-solid-gray-300`;
export const iconButtonClass = `${outlineButtonClass} w-12 shrink-0`;

export const sidePanelQuery = "(min-width: 1024px)";
