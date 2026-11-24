"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CS2INSPECT, ERROR_MESSAGES } from "./config";
import type { CS2InspectView, InspectErrorReason, InspectSpec } from "./types";

let scriptPromise: Promise<void> | null = null;

/** Carrega o SDK oficial uma única vez. */
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.CS2Inspect) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CS2INSPECT.scriptUrl;
    s.async = true;
    s.onload = () => (window.CS2Inspect ? resolve() : reject(new Error("SDK indisponível")));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Falha ao carregar o embed.js do CS2Inspect"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type InspectStatus = "idle" | "loading" | "ready" | "error";

export interface InspectError {
  reason: string;
  message: string;
}

/**
 * Monta UM visualizador (fair use: nunca vários ao mesmo tempo) e expõe a
 * instância do SDK. `remount` recria o frame com uma especificação completa —
 * usado para remover itens (luvas, cenário, adesivos), já que a API não
 * documenta uma forma de limpá-los ao vivo.
 */
export function useCs2Inspect(containerId: string, enabled: boolean) {
  const viewRef = useRef<CS2InspectView | null>(null);
  const [status, setStatus] = useState<InspectStatus>("idle");
  const [error, setError] = useState<InspectError | null>(null);
  const [resolvedItem, setResolvedItem] = useState<unknown>(null);

  const mount = useCallback(
    async (spec: InspectSpec) => {
      if (!enabled) return;
      setStatus("loading");
      setError(null);
      try {
        await loadSdk();
        const host = document.getElementById(containerId);
        if (!host || !window.CS2Inspect) return;
        viewRef.current?.destroy();
        host.innerHTML = "";
        const view = window.CS2Inspect.embed(host, { ...spec, key: CS2INSPECT.publicKey });
        viewRef.current = view;
        view.on("ready", (e) => {
          setResolvedItem(e?.item ?? null);
          setStatus("ready");
        });
        view.on("error", (e) => {
          const reason = String(e?.reason ?? "unknown");
          setError({
            reason,
            message: ERROR_MESSAGES[reason as InspectErrorReason] ?? e?.message ?? "Erro no visualizador.",
          });
          setStatus("error");
        });
      } catch (err) {
        setError({ reason: "sdk", message: err instanceof Error ? err.message : "Falha ao carregar o SDK" });
        setStatus("error");
      }
    },
    [containerId, enabled],
  );

  useEffect(
    () => () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    },
    [],
  );

  /** Foca o frame para que os atalhos de teclado do visualizador funcionem. */
  const focusFrame = useCallback(() => viewRef.current?.iframe.focus(), []);

  return { view: viewRef, status, error, resolvedItem, mount, focusFrame };
}
