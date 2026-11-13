import { useEffect, useState } from "react";

export function useObjectUrl(blob: Blob | undefined) {
  const [entry, setEntry] = useState<{ blob: Blob; url: string }>();

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return entry && entry.blob === blob ? entry.url : undefined;
}
