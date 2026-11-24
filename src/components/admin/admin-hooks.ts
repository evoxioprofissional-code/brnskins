"use client";

import { useEffect, useMemo, useState } from "react";
import type { Skin } from "@/types/catalog";
import { skinDisplayName } from "@/lib/skin";
import { useAdminData } from "./admin-data-provider";

export function useSkinMap() {
  const { skins } = useAdminData();
  return useMemo(() => {
    const map = new Map<string, Skin>(skins.map((s) => [s.id, s]));
    return { map, name: (id?: string) => (id && map.get(id) ? skinDisplayName(map.get(id)!) : "—") };
  }, [skins]);
}

/** Lê um parâmetro da URL no cliente (sem exigir Suspense). */
export function useQueryParam(key: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(key));
  }, [key]);
  return value;
}

/** Gera e baixa um CSV (separador ";" para abrir direto no Excel pt-BR). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = typeof v === "number" ? v.toString().replace(".", ",") : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
