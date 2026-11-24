"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES, getCategory, getRarity } from "@/config/catalog";
import { formatBRL } from "@/lib/format";
import { getOffer, skinDisplayName, wearName } from "@/lib/skin";
import { useSettingsStore } from "@/stores/settings-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { AdminCard, AdminPageHeader, DemoNotice, Table, Toggle, inputClass } from "./admin-ui";
import { useAdminData } from "./admin-data-provider";

export function AdminSkins() {
  const hydrated = useHydrated();
  const { skins } = useAdminData();
  const hidden = useSettingsStore((s) => s.hiddenSkins);
  const toggleHidden = useSettingsStore((s) => s.toggleHidden);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const list = useMemo(
    () =>
      skins.filter(
        (s) =>
          (cat === "all" || s.category === cat) &&
          skinDisplayName(s).toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [skins, q, cat],
  );

  return (
    <>
      <AdminPageHeader title="Skins" description="Gerencie os itens exibidos no catálogo." />
      <DemoNotice>
        Catálogo demonstrativo. Cadastro e edição completos serão habilitados com a tabela <code>products</code> do Supabase;
        aqui já é possível ocultar/exibir itens (salvo neste navegador).
      </DemoNotice>
      <AdminCard>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center rounded-[8px] border border-[#1d1e22] bg-[#0e0f11] px-3">
            <Search size={16} className="text-fg-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar skin..." className="ml-2 flex-1 bg-transparent text-[13.5px] outline-none" />
          </label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputClass} w-auto`} aria-label="Categoria">
            <option value="all">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Table head={["Item", "Categoria", "Raridade", "Condição padrão", "Preço", "Visível"]}>
          {list.map((s) => {
            const offer = getOffer(s);
            const rarity = getRarity(s.rarity);
            const visible = !(hydrated && hidden.includes(s.id));
            return (
              <tr key={s.id} className={visible ? "" : "opacity-50"}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-14 shrink-0">
                      <Image src={s.image} alt="" fill sizes="56px" className="object-contain" />
                    </div>
                    <span className="font-semibold">{skinDisplayName(s)}</span>
                  </div>
                </td>
                <td>{getCategory(s.category)?.label}</td>
                <td style={{ color: rarity?.color }}>{rarity?.name}</td>
                <td>{wearName(offer.wear)}</td>
                <td className="font-semibold">{formatBRL(offer.price)}</td>
                <td>
                  <Toggle checked={visible} onChange={() => toggleHidden(s.id)} label={`Visibilidade de ${skinDisplayName(s)}`} />
                </td>
              </tr>
            );
          })}
        </Table>
      </AdminCard>
    </>
  );
}
