"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackagePlus, Search, ShoppingBag, Wallet, Warehouse } from "lucide-react";
import type { StockLot, StockStatus } from "@/types/admin";
import type { WearCode } from "@/types/catalog";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { skinDisplayName, wearName } from "@/lib/skin";
import { STOCK_STATUS, lotVariationPct, stockSummary } from "@/lib/admin-metrics";
import { useAdminStore } from "@/stores/admin-store";
import { toast } from "@/components/ui/toaster";
import { useAdminData } from "./admin-data-provider";
import { useQueryParam, useSkinMap } from "./admin-hooks";
import { DemoNotice, Field, KpiCard, Modal, Panel, PrimaryButton, Table, inputClass } from "./admin-ui";

function PurchaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { skins } = useAdminData();
  const addPurchase = useAdminStore((s) => s.addPurchase);
  const [skinId, setSkinId] = useState(skins[0]?.id ?? "");
  const skin = skins.find((s) => s.id === skinId);
  const [wear, setWear] = useState<WearCode>(skin?.defaultWear ?? "FN");
  const [qty, setQty] = useState(1);
  const offer = skin?.offers.find((o) => o.wear === wear) ?? skin?.offers[0];
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (skin && !skin.offers.some((o) => o.wear === wear)) setWear(skin.defaultWear);
  }, [skin, wear]);

  const submit = () => {
    const unitCost = Number(cost.replace(",", "."));
    if (!skin || !offer || !(unitCost > 0) || qty < 1) {
      toast("Preencha skin, quantidade e custo", "error");
      return;
    }
    addPurchase({ skin, wear: offer.wear, quantity: qty, unitCost, marketPrice: offer.price });
    toast(`Compra registrada: ${qty}x ${skinDisplayName(skin)}`);
    setCost("");
    setQty(1);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar compra de skins">
      <div className="space-y-3.5">
        <Field label="Skin">
          <select className={inputClass} value={skinId} onChange={(e) => setSkinId(e.target.value)}>
            {skins.map((s) => (
              <option key={s.id} value={s.id}>
                {skinDisplayName(s)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Condição">
            <select className={inputClass} value={wear} onChange={(e) => setWear(e.target.value as WearCode)}>
              {skin?.offers.map((o) => (
                <option key={o.wear} value={o.wear}>
                  {wearName(o.wear)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantidade">
            <input className={inputClass} type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </div>
        <Field label="Custo unitário pago (R$)" hint={offer ? `Valor de mercado atual: ${formatBRL(offer.price)}` : undefined}>
          <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
        </Field>
        <PrimaryButton onClick={submit}>
          <PackagePlus size={16} /> Registrar entrada
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function SaleModal({ lot, onClose }: { lot: StockLot | null; onClose: () => void }) {
  const clients = useAdminStore((s) => s.clients);
  const registerSale = useAdminStore((s) => s.registerSale);
  const { name } = useSkinMap();
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [clientId, setClientId] = useState("");
  useEffect(() => {
    if (lot) {
      setQty(1);
      setPrice(lot.marketPrice.toFixed(2));
      setClientId("");
    }
  }, [lot]);
  if (!lot) return null;
  const unit = Number(price.replace(",", "."));
  const profit = (unit - lot.unitCost) * qty;
  return (
    <Modal open onClose={onClose} title="Registrar venda">
      <p className="mb-3 text-[13px] text-fg-2">
        {name(lot.skinId)} · {wearName(lot.wear)} · {lot.quantity} em estoque
      </p>
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade">
            <input className={inputClass} type="number" min={1} max={lot.quantity} value={qty} onChange={(e) => setQty(Math.min(lot.quantity, Math.max(1, Number(e.target.value) || 1)))} />
          </Field>
          <Field label="Preço unitário (R$)">
            <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>
        <Field label="Cliente (opcional)">
          <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Sem cliente vinculado</option>
            {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (@{c.handle})
              </option>
            ))}
          </select>
        </Field>
        <p className={cn("rounded-[8px] px-3 py-2 text-[13px]", profit >= 0 ? "bg-[#0b2a17] text-[#3ee07a]" : "bg-[#2a0b10] text-[#ff5a6e]")}>
          {profit >= 0 ? "Lucro" : "Prejuízo"} estimado: {formatBRL(Math.abs(Number.isFinite(profit) ? profit : 0))}
        </p>
        <PrimaryButton
          onClick={() => {
            if (!(unit > 0)) return toast("Preço inválido", "error");
            registerSale({ lotId: lot.id, quantity: qty, unitPrice: unit, clientId: clientId || undefined, description: `Venda · ${name(lot.skinId)}` });
            toast("Venda registrada");
            onClose();
          }}
        >
          <ShoppingBag size={16} /> Confirmar venda
        </PrimaryButton>
      </div>
    </Modal>
  );
}

export function AdminStock() {
  const stock = useAdminStore((s) => s.stock);
  const setLotStatus = useAdminStore((s) => s.setLotStatus);
  const { map, name } = useSkinMap();
  const action = useQueryParam("acao");
  const qParam = useQueryParam("q");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [saleLot, setSaleLot] = useState<StockLot | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StockStatus | "all" | "low">("all");

  useEffect(() => {
    if (action === "compra") setPurchaseOpen(true);
  }, [action]);
  useEffect(() => {
    if (qParam) setQ(qParam);
  }, [qParam]);

  const sum = useMemo(() => stockSummary(stock), [stock]);
  const low = stock.filter((l) => l.quantity <= 2).length;
  const list = useMemo(
    () =>
      stock
        .filter((l) => (status === "all" ? true : status === "low" ? l.quantity <= 2 : l.status === status))
        .filter((l) => name(l.skinId).toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.marketPrice * b.quantity - a.marketPrice * a.quantity),
    [stock, status, q, name],
  );

  return (
    <div className="space-y-4">
      <DemoNotice />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Unidades em estoque" value={formatInt(sum.units)} icon={Boxes} />
        <KpiCard label="Valor pago (custo)" value={formatBRL(sum.costValue)} icon={Wallet} />
        <KpiCard label="Valor de mercado" value={formatBRL(sum.marketValue)} trend={sum.costValue ? Math.round(((sum.marketValue - sum.costValue) / sum.costValue) * 1000) / 10 : 0} icon={Warehouse} />
        <KpiCard label="Lotes com estoque baixo" value={formatInt(low)} hint="2 unidades ou menos" icon={AlertTriangle} />
      </div>
      <Panel
        title="Inventário"
        icon={Warehouse}
        actions={
          <PrimaryButton small onClick={() => setPurchaseOpen(true)}>
            <PackagePlus size={15} /> Registrar compra
          </PrimaryButton>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center rounded-[8px] border border-[#1d1e22] bg-[#0e0f11] px-3">
            <Search size={16} className="text-fg-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar skin..." className="ml-2 flex-1 bg-transparent text-[13.5px] outline-none" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {([["all", "Todos"], ...Object.entries(STOCK_STATUS).map(([k, v]) => [k, v.label]), ["low", "Estoque baixo"]] as [string, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatus(k as typeof status)}
                className={cn("h-10 rounded-[8px] border px-3 text-[12.5px] font-semibold transition-colors", status === k ? "border-primary bg-primary/15 text-white" : "border-[#1d1e22] bg-[#0e0f11] text-fg-2 hover:text-fg")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Table head={["Skin", "Condição", "Qtd", "Custo un.", "Mercado un.", "Variação", "Status", ""]} minWidth={900}>
          {list.map((l) => {
            const pct = lotVariationPct(l);
            const total = (l.marketPrice - l.unitCost) * l.quantity;
            const skin = map.get(l.skinId);
            return (
              <tr key={l.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-14 shrink-0">{skin && <Image src={skin.image} alt="" fill sizes="56px" className="object-contain" />}</div>
                    <span className="font-semibold">{name(l.skinId)}</span>
                  </div>
                </td>
                <td className="text-fg-2">{l.wear}</td>
                <td className={cn("font-semibold", l.quantity <= 2 && "text-amber-300")}>{formatInt(l.quantity)}</td>
                <td>{formatBRL(l.unitCost)}</td>
                <td>{formatBRL(l.marketPrice)}</td>
                <td className={pct >= 0 ? "text-[#3ee07a]" : "text-[#ff5a6e]"}>
                  <span className="font-semibold">{pct >= 0 ? "+" : ""}{pct.toFixed(1).replace(".", ",")}%</span>
                  <span className="block text-[11.5px] opacity-80">{total >= 0 ? "+" : "-"}{formatBRL(Math.abs(total))}</span>
                </td>
                <td>
                  <select
                    value={l.status}
                    onChange={(e) => setLotStatus(l.id, e.target.value as StockStatus)}
                    aria-label="Status do lote"
                    className="h-8 rounded-[6px] border border-[#24252b] bg-[#0e0f12] px-2 text-[12.5px]"
                    style={{ color: STOCK_STATUS[l.status].color }}
                  >
                    {Object.entries(STOCK_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button type="button" onClick={() => setSaleLot(l)} className="h-8 rounded-[6px] border border-primary/60 px-3 text-[12px] font-semibold hover:bg-primary/10">
                    Vender
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
        {!list.length && <p className="py-8 text-center text-[13px] text-fg-2">Nenhum lote encontrado.</p>}
      </Panel>
      <PurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} />
      <SaleModal lot={saleLot} onClose={() => setSaleLot(null)} />
    </div>
  );
}
