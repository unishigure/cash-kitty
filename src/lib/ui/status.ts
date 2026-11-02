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

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
