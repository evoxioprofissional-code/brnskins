"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useCatalogStore } from "@/stores/catalog-store";
import { useIsDesktop } from "@/hooks/use-media-query";
import { Header } from "./header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { Toaster } from "@/components/ui/toaster";

import { DRAWER_WIDTH } from "@/config/layout";

/**
 * Casca da loja: header + conteúdo. Quando o drawer de detalhes está aberto
 * (desktop), o conteúdo encolhe para a largura restante em vez de ser coberto.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isImmersive = pathname.startsWith("/inspect");
  const drawerOpen = useCatalogStore((s) => s.selectedSkinId !== null);
  const isDesktop = useIsDesktop();

  if (isAdmin || isImmersive) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={false}
        animate={{ marginRight: drawerOpen && isDesktop ? DRAWER_WIDTH : 0 }}
        transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-dvh pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-0"
      >
        <Header />
        {children}
      </motion.div>
      <MobileBottomNav />
      <Toaster />
    </>
  );
}
