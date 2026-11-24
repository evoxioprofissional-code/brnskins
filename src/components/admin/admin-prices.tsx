"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { skinDisplayName } from "@/lib/skin";
import { useSettingsStore } from "@/stores/settings-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { priceSchema } from "@/validations/admin";
import { AdminCard, AdminPageHeader, DemoNotice, Table } from "./admin-ui";
import { useAdminData } from "./admin-data-provider";
import { toast } from "@/components/ui/toaster";

function PriceCell({ skinId, wear, base }: { skinId: string; wear: string; base: number }) {
  const key = `${skinId}:${wear}`;
  const override = useSettingsStore((s) => s.priceOverrides[key]);
  const setOverride = useSettingsStore((s) => s.setPriceOverride);
  const hydrated = useHydrated();
  const current = hydrated && override !== undefined ? override : base;
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = priceSchema.safeParse(draft.replace(",", "."));
    if (!parsed.success) {
      toast("Preço inválido", "error");
    } else if (parsed.data !== current) {
      setOverride(key, parsed.data === base ? null : parsed.data);
      toast("Preço atualizado");
    }
    setDraft(null);
  };

  return (
    <input
      value={draft ?? current.toFixed(2)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      inputMode="decimal"
      aria-label={`Preço ${wear}`}
      className={`h-8 w-[96px] rounded-[6px] border bg-[#0e0f11] px-2 text-right text-[12.5px] outline-none focus:border-primary/60 ${
        hydrated && override !== undefined ? "border-amber-400/40 text-amber-200" : "border-[#1d1e22]"
      }`}
    />
  );
}

export function AdminPrices() {
  const { skins } = useAdminData();
  const overrides = useSettingsStore((s) => s.priceOverrides);
  const setOverride = useSettingsStore((s) => s.setPriceOverride);
  const hydrated = useHydrated();
  const count = hydrated ? Object.keys(overrides).length : 0;

  return (
    <>
      <AdminPageHeader
        title="Preços"
        description="Ajuste o preço de cada condição. Valores alterados ficam destacados."
        actions={
          count > 0 && (
            <button
              type="button"
              onClick={() => {
                Object.keys(overrides).forEach((k) => setOverride(k, null));
                toast("Preços restaurados");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#34353b] px-3 text-[13px] font-semibold hover:border-[#4a4b52]"
            >
              <RotateCcw size={15} /> Restaurar {count} {count === 1 ? "ajuste" : "ajustes"}
            </button>
          )
        }
      />
      <DemoNotice>
        Preços demonstrativos. A arquitetura já prevê provedores externos de preço (<code>src/services/pricing</code>), que serão
        conectados quando houver endpoint e credenciais oficiais.
      </DemoNotice>
      <AdminCard>
        <Table head={["Item", "FN", "MW", "FT", "WW", "BS", "Steam (ref.)"]}>
          {skins.map((s) => (
            <tr key={s.id}>
              <td className="font-semibold">{skinDisplayName(s)}</td>
              {(["FN", "MW", "FT", "WW", "BS"] as const).map((w) => {
                const o = s.offers.find((x) => x.wear === w);
                return <td key={w}>{o ? <PriceCell skinId={s.id} wear={w} base={o.price} /> : <span className="text-faint">—</span>}</td>;
              })}
              <td className="text-fg-2">{formatBRL(s.offers[0]?.steamPrice ?? 0)}</td>
            </tr>
          ))}
        </Table>
      </AdminCard>
    </>
  );
}
