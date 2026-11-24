import { createJSONStorage, type StateStorage } from "zustand/middleware";

const memory = (): StateStorage => {
  const mem = new Map<string, string>();
  return {
    getItem: (n) => mem.get(n) ?? null,
    setItem: (n, v) => {
      mem.set(n, v);
    },
    removeItem: (n) => {
      mem.delete(n);
    },
  };
};

/** localStorage seguro (SSR / modo privado / bloqueado). */
export const safeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") return memory();
  try {
    const k = "__brn_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return memory();
  }
});
