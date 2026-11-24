"use client";

import Image from "next/image";
import { CATEGORIES, RARITIES } from "@/config/catalog";
import { CATEGORY_ICONS } from "@/components/icons/category-icons";
import { formatBRL } from "@/lib/format";
import { getOffer, priceFor, skinDisplayName, wearName } from "@/lib/skin";
import { AdminCard, AdminPageHeader, DemoNotice, Table } from "./admin-ui";
import { useAdminData } from "./admin-data-provider";

export function AdminCategories() {
  const { skins } = useAdminData();
  return (
    <>
      <AdminPageHeader title="Categorias" description="Categorias e raridades usadas nos filtros do catálogo." />
      <DemoNotice>
        Estrutura pronta para as tabelas <code>categories</code> e <code>rarities</code>. Nesta etapa os valores vêm de{" "}
        <code>src/config/catalog.ts</code>.
      </DemoNotice>
      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard title="Categorias">
          <Table head={["", "Nome", "Badge", "Ordem", "Skins"]}>
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.id];
              return (
                <tr key={c.id}>
                  <td className="w-8 text-fg-2">
                    <Icon size={17} />
                  </td>
                  <td className="font-semibold">{c.label}</td>
                  <td>
                    <span className="rounded-[4px] bg-primary px-1.5 py-0.5 text-[10px] font-bold">{c.badge}</span>
                  </td>
                  <td className="text-fg-2">{c.sortOrder}</td>
                  <td>{skins.filter((s) => s.category === c.id).length}</td>
                </tr>
              );
            })}
          </Table>
        </AdminCard>
        <AdminCard title="Raridades">
          <Table head={["Cor", "Nome", "Português", "Skins"]}>
            {RARITIES.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="block size-4 rounded-full" style={{ background: r.color }} />
                </td>
                <td className="font-semibold" style={{ color: r.color }}>
                  {r.name}
                </td>
                <td className="text-fg-2">{r.label}</td>
                <td>{skins.filter((s) => s.rarity === r.id).length}</td>
              </tr>
            ))}
          </Table>
        </AdminCard>
      </div>
    </>
  );
}

export function AdminKits() {
  const { kits, skins } = useAdminData();
  const byId = new Map(skins.map((s) => [s.id, s]));
  return (
    <>
      <AdminPageHeader title="Kits" description="Combinações de skins vendidas como conjunto." />
      <DemoNotice>
        Kits demonstrativos. Criação e edição serão gravadas nas tabelas <code>kits</code> e <code>kit_items</code>.
      </DemoNotice>
      <div className="grid gap-4 lg:grid-cols-2">
        {kits.map((k) => {
          const items = k.items.map((i) => ({ ...i, skin: byId.get(i.skinId) })).filter((i) => i.skin);
          const sum = items.reduce((s, i) => s + priceFor(getOffer(i.skin!, i.wear), i.variant), 0);
          return (
            <AdminCard key={k.id} title={k.name} actions={k.tag && <span className="text-[11px] font-bold uppercase text-primary">{k.tag}</span>}>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.skinId} className="flex items-center gap-3 text-[13px]">
                    <div className="relative h-8 w-12 shrink-0">
                      <Image src={i.skin!.image} alt="" fill sizes="48px" className="object-contain" />
                    </div>
                    <span className="flex-1 truncate">{skinDisplayName(i.skin!)}</span>
                    <span className="text-fg-2">{wearName(i.wear)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-[13px]">
                <span className="text-fg-2">
                  Itens separados: <span className="line-through">{formatBRL(sum)}</span>
                </span>
                <span className="font-bold">{formatBRL(k.price)}</span>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </>
  );
}
