export function createSignal() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of listeners) listener();
    },
  };
}

export function createStore<T extends object>(initial: T) {
  const signal = createSignal();
  let state = initial;
  return {
    subscribe: signal.subscribe,
    get: () => state,
    update(patch: Partial<T>) {
      state = { ...state, ...patch };
      signal.notify();
    },
  };
}
