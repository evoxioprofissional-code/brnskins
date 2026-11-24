"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true somente no cliente após a hidratação (evita mismatch com stores persistidas). */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
