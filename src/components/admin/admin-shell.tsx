"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAdminStore } from "@/stores/admin-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAdminData } from "./admin-data-provider";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { skins } = useAdminData();
  const seeded = useAdminStore((s) => s.seeded);
  const ensureSeed = useAdminStore((s) => s.ensureSeed);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated) ensureSeed(skins);
  }, [hydrated, ensureSeed, skins]);
  useEffect(() => setMenu(false), [pathname]);

  return (
    <div className="min-h-dvh bg-[#050608] lg:flex">
      <AdminSidebar mobileOpen={menu} onClose={() => setMenu(false)} />
      <div className="min-w-0 flex-1">
        <AdminTopbar onMenu={() => setMenu(true)} />
        <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8 lg:py-7">
          {hydrated && seeded ? (
            children
          ) : (
            <div className="grid gap-4 md:grid-cols-4" aria-busy>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-[12px] bg-white/[0.03]" />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
