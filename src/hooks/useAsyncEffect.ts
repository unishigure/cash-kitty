import { type DependencyList, useEffect, useEffectEvent } from "react";

export function useAsyncEffect<T>(
  load: () => Promise<T> | undefined,
  {
    onLoad,
    onError,
  }: { onLoad: (value: T) => void; onError: (error: unknown) => void },
  deps: DependencyList,
) {
  const start = useEffectEvent(load);
  const handleLoad = useEffectEvent(onLoad);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    let cancelled = false;
    start()?.then(
      (value) => {
        if (!cancelled) handleLoad(value);
      },
      (error: unknown) => {
        if (!cancelled) handleError(error);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps は呼び出し側が指定する
  }, deps);
}
