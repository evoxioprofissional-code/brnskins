"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CatalogDataSource, Kit, Skin } from "@/types/catalog";

interface AdminData {
  /** Dados originais vindos do repositório (sem overrides) */
  skins: Skin[];
  kits: Kit[];
  source: CatalogDataSource;
}

const Ctx = createContext<AdminData | null>(null);

export function AdminDataProvider({ children, ...value }: AdminData & { children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminData fora de <AdminDataProvider>");
  return v;
}
