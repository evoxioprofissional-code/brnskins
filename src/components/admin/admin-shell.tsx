"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAdminStore } from "@/stores/admin-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAdminData } from "./admin-data-provider";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { CommandPalette } from "./command-palette";

const COLLAPSE_KEY = "brn-admin-sidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { skins } = useAdminData();
  const seeded = useAdminStore((s) => s.seeded);
  const ensureSeed = useAdminStore((s) => s.ensureSeed);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated) ensureSeed(skins);
  }, [hydrated, ensureSeed, skins]);
  useEffect(() => setMenu(false), [pathname]);

  // Menu recolhido lembrado neste navegador
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* armazenamento indisponível */
    }
  }, []);
  const toggle = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      } catch {
        /* armazenamento indisponível */
      }
      return !v;
    });

  // Ctrl/Cmd + K abre a paleta de comandos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_600px_at_100%_-10%,rgb(230_0_35/0.07),transparent_60%),#050608] lg:flex">
      <AdminSidebar mobileOpen={menu} onClose={() => setMenu(false)} collapsed={collapsed} onToggle={toggle} />
      <div className="min-w-0 flex-1">
        <AdminTopbar onMenu={() => setMenu(true)} onSearch={() => setPalette(true)} />
        <main className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8 lg:py-7">
          {hydrated && seeded ? (
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {children}
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4" aria-busy>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-[16px] bg-white/[0.03]" />
              ))}
            </div>
          )}
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
