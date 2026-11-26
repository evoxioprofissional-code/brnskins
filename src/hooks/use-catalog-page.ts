"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Skin } from "@/types/catalog";
import { queryToParams, type CatalogPage, type CatalogQuery } from "@/lib/catalog-query";
import { useCatalogResultStore } from "@/stores/catalog-result-store";

const pageCache = new Map<string, CatalogPage>();
const MAX_CACHE = 60;

async function fetchCatalog<T>(params: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/catalog?${params}`, { signal });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Página do catálogo vinda do servidor. Usa a página inicial (SSR) quando a
 * consulta é a mesma, guarda as páginas já vistas e espera o usuário parar
 * de digitar antes de buscar.
 */
export function useCatalogPage(query: CatalogQuery, opts: { initial?: CatalogPage | null; initialKey?: string; publish?: boolean; enabled?: boolean } = {}) {
  const { initial = null, publish = true, enabled = true } = opts;
  const key = useMemo(() => queryToParams(query).toString(), [query]);
  const initialKey = opts.initialKey ?? "";
  // Página vinda do servidor: usada direto (o cache em memória só existe no navegador)
  const fromInitial = initial && key === initialKey ? initial : null;

  const [data, setData] = useState<CatalogPage | null>(() => fromInitial ?? (typeof window !== "undefined" ? (pageCache.get(key) ?? null) : null));
  const [loading, setLoading] = useState(!fromInitial && !(typeof window !== "undefined" && pageCache.has(key)));
  const [error, setError] = useState(false);
  const remember = useCatalogResultStore((s) => s.remember);
  const setSummary = useCatalogResultStore((s) => s.setSummary);
  const setGlobalLoading = useCatalogResultStore((s) => s.setLoading);
  const lastQueryText = useRef(query.filters.query);

  useEffect(() => {
    if (!enabled) return;
    if (initial && !pageCache.has(initialKey)) pageCache.set(initialKey, initial);
    const cached = pageCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(false);
      remember(cached.items);
      if (publish) setSummary(cached);
      return;
    }
    const controller = new AbortController();
    // Digitação: espera 250 ms; demais mudanças (página, filtro) são imediatas
    const typing = lastQueryText.current !== query.filters.query;
    lastQueryText.current = query.filters.query;
    setLoading(true);
    if (publish) setGlobalLoading(true);
    const timer = setTimeout(async () => {
      try {
        const page = await fetchCatalog<CatalogPage>(key, controller.signal);
        if (pageCache.size > MAX_CACHE) pageCache.delete(pageCache.keys().next().value!);
        pageCache.set(key, page);
        remember(page.items);
        setData(page);
        setError(false);
        if (publish) setSummary(page);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (publish) setGlobalLoading(false);
        }
      }
    }, typing ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, publish, query.filters.query]);

  return { data, loading, error };
}

/** Busca itens específicos (por id ou nome de mercado) e guarda no cache. */
export function useCatalogItems(spec: { ids?: string[]; names?: string[] }) {
  const ids = spec.ids ?? null;
  const names = spec.names ?? null;
  const key = ids ? `ids=${encodeURIComponent([...ids].sort().join(","))}` : names ? `names=${encodeURIComponent([...names].sort().join(";"))}` : "";
  const cache = useCatalogResultStore((s) => s.skins);
  const remember = useCatalogResultStore((s) => s.remember);
  const [loading, setLoading] = useState(false);
  const [fetchedNames, setFetchedNames] = useState<Skin[]>([]);

  const missing = ids ? ids.filter((id) => !cache[id]) : null;
  const needsFetch = Boolean(key) && (ids ? missing!.length > 0 : Boolean(names?.length));

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    setLoading(true);
    fetchCatalog<{ items: Skin[] }>(ids ? `ids=${encodeURIComponent(missing!.join(","))}` : key, controller.signal)
      .then((r) => {
        remember(r.items);
        if (names) setFetchedNames(r.items);
      })
      .catch(() => {})
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needsFetch]);

  const items = ids ? ids.flatMap((id) => (cache[id] ? [cache[id]!] : [])) : fetchedNames;
  return { items, loading: loading && needsFetch };
}
