"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCopy, Download, Info, Search, Trash2, X } from "lucide-react";
import type { QuoteItem } from "@/lib/quote";
import { WEAR_COLORS } from "@/config/catalog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import type { WearCode } from "@/types/catalog";

type Base = "buff163" | "c5game";
type Currency = "BRL" | "CNY";
interface StoreLine {
  item: QuoteItem;
  qty: number;
  /** Cotação só deste item (R$ por ¥) */
  rate: number | null;
}
interface ClientLine {
  item: QuoteItem;
  discount: number;
}

const RATE_PRESETS = [0.76, 0.82, 0.85, 1];
const DISCOUNTS = [10, 15, 20];
const STORAGE = "brn-cotador-v1";
const BASE_LABEL: Record<Base, string> = { buff163: "BUFF163", c5game: "C5Game" };

const n2 = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtCny = (v: number) => `¥ ${n2(v)}`;
const shortName = (name: string) => name.replace("StatTrak™", "ST™").replace("Factory New", "FN").replace("Minimal Wear", "MW").replace("Field-Tested", "FT").replace("Well-Worn", "WW").replace("Battle-Scarred", "BS");

/** Preço em ¥ no mercado base (cai para o outro mercado se o base não tiver) */
const cnyOf = (item: QuoteItem, base: Base) => (base === "buff163" ? (item.buffCny ?? item.c5Cny) : (item.c5Cny ?? item.buffCny)) ?? 0;
const usedBase = (item: QuoteItem, base: Base): Base => (base === "buff163" ? (item.buffCny ? "buff163" : "c5game") : item.c5Cny ? "c5game" : "buff163");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Partial<{ base: Base; rate: number; upgrade: boolean; store: StoreLine[]; client: ClientLine[]; count: { day: string; n: number } }>) : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ busca */

function ItemPicker({ onAdd, placeholder, initialQuery = "" }: { onAdd: (items: QuoteItem[]) => void; placeholder: string; initialQuery?: string }) {
  const [tab, setTab] = useState<"search" | "paste">("search");
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<QuoteItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paste, setPaste] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/quote?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { items?: QuoteItem[] };
        setResults(data.items ?? []);
        setOpen(true);
      } catch {
        /* cancelada */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const addPasted = async () => {
    const lines = paste.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 60);
    if (!lines.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines }) });
      const data = (await res.json()) as { results?: { line: string; item: QuoteItem | null }[] };
      const found = (data.results ?? []).flatMap((r) => (r.item ? [r.item] : []));
      setMissing((data.results ?? []).filter((r) => !r.item).map((r) => r.line));
      if (found.length) {
        onAdd(found);
        toast(`${found.length} ${found.length === 1 ? "item adicionado" : "itens adicionados"}`);
        setPaste("");
      }
    } catch {
      toast("Não foi possível ler a lista", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="mb-2 flex gap-1">
        {(
          [
            ["search", "Buscar"],
            ["paste", "Colar lista"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn("h-7 rounded-full px-3 text-[12px] font-medium transition-colors", tab === id ? "bg-white/[0.1] text-white" : "text-muted hover:text-fg")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "search" ? (
        <>
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-white/[0.08] bg-black/30 px-3 focus-within:border-primary/60">
            <Search size={15} className="text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-full flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
            />
            {loading && <span className="text-[11px] text-faint">buscando…</span>}
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Limpar busca" className="text-faint hover:text-white">
                <X size={14} />
              </button>
            )}
          </label>
          {open && results.length > 0 && (
            <ul className="scrollbar-thin absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[340px] overflow-y-auto rounded-[12px] border border-white/[0.1] bg-[#0f1013] p-1 shadow-2xl">
              {results.map((it) => (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd([it]);
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center gap-3 rounded-[8px] px-2 py-1.5 text-left hover:bg-white/[0.05]"
                  >
                    <span className="relative h-8 w-11 shrink-0">{it.image && <Image src={it.image} alt="" fill sizes="44px" className="object-contain" />}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{it.name}</span>
                    <span className="shrink-0 text-right text-[11px] tabular-nums text-muted">
                      {it.buffCny ? `BUFF ${fmtCny(it.buffCny)}` : ""}
                      {it.buffCny && it.c5Cny ? " · " : ""}
                      {it.c5Cny ? `C5 ${fmtCny(it.c5Cny)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"Uma skin por linha. Ex.:\nKarambit Tiger Tooth FN\nAK-47 | Redline (Field-Tested)\nST AWP Asiimov FT"}
            aria-label="Colar lista de skins"
            className="h-28 w-full resize-y rounded-[10px] border border-white/[0.08] bg-black/30 p-3 text-[12.5px] outline-none placeholder:text-faint focus:border-primary/60"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-faint">O desgaste (FN, MW, FT…) e StatTrak são reconhecidos sozinhos. Sem desgaste, usa FT.</span>
            <button
              type="button"
              onClick={addPasted}
              disabled={loading || !paste.trim()}
              className="h-8 shrink-0 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-black disabled:opacity-40"
            >
              {loading ? "Lendo…" : "Adicionar"}
            </button>
          </div>
          {missing.length > 0 && <p className="mt-2 text-[11.5px] text-amber-300">Não encontrei: {missing.join(" · ")}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ página */

export function AdminQuote({ yuanToday, storeRate, configured }: { yuanToday: number; storeRate: number; configured: boolean }) {
  // Skin escolhida na paleta de comandos (?q=) já entra buscada
  const initialQuery = useSearchParams().get("q") ?? "";
  const [base, setBase] = useState<Base>("buff163");
  const [rate, setRate] = useState(storeRate);
  const [rateInput, setRateInput] = useState(n2(storeRate));
  const [currency, setCurrency] = useState<Currency>("BRL");
  const [upgrade, setUpgrade] = useState(false);
  const [store, setStore] = useState<StoreLine[]>([]);
  const [client, setClient] = useState<ClientLine[]>([]);
  const [today, setToday] = useState(0);
  const loaded = useRef(false);

  // Restaura a última cotação deste navegador
  useEffect(() => {
    const s = loadState();
    if (s.base) setBase(s.base);
    if (s.rate) {
      setRate(s.rate);
      setRateInput(n2(s.rate));
    }
    if (typeof s.upgrade === "boolean") setUpgrade(s.upgrade);
    if (s.store) setStore(s.store);
    if (s.client) setClient(s.client);
    const day = new Date().toISOString().slice(0, 10);
    setToday(s.count?.day === day ? s.count.n : 0);
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      const day = new Date().toISOString().slice(0, 10);
      localStorage.setItem(STORAGE, JSON.stringify({ base, rate, upgrade, store, client, count: { day, n: today } }));
    } catch {
      /* armazenamento indisponível */
    }
  }, [base, rate, upgrade, store, client, today]);

  const addStore = (items: QuoteItem[]) =>
    setStore((prev) => {
      const next = [...prev];
      for (const it of items) {
        const found = next.find((l) => l.item.key === it.key);
        if (found) found.qty += 1;
        else next.push({ item: it, qty: 1, rate: null });
      }
      return [...next];
    });
  const addClient = (items: QuoteItem[]) => setClient((prev) => [...prev, ...items.filter((it) => !prev.some((l) => l.item.key === it.key)).map((item) => ({ item, discount: 15 }))]);

  const totals = useMemo(() => {
    const storeCny = store.reduce((s, l) => s + cnyOf(l.item, base) * l.qty, 0);
    const storeBrl = store.reduce((s, l) => s + cnyOf(l.item, base) * (l.rate ?? rate) * l.qty, 0);
    const clientFull = upgrade ? client.reduce((s, l) => s + cnyOf(l.item, base) * rate, 0) : 0;
    const clientBrl = upgrade ? client.reduce((s, l) => s + cnyOf(l.item, base) * rate * (1 - l.discount / 100), 0) : 0;
    const clientCny = upgrade ? client.reduce((s, l) => s + cnyOf(l.item, base), 0) : 0;
    const pix = storeBrl - clientBrl;
    // Lucro: sua cotação acima do yuan do dia nos itens da loja + desconto nos itens do cliente
    const profit = store.reduce((s, l) => s + cnyOf(l.item, base) * ((l.rate ?? rate) - yuanToday) * l.qty, 0) + (clientFull - clientBrl);
    return { storeCny, storeBrl, clientBrl, clientCny, pix, profit };
  }, [store, client, base, rate, upgrade, yuanToday]);

  const money = (brl: number, cny: number) => (currency === "BRL" ? formatBRL(brl) : fmtCny(cny));

  const quoteText = () => {
    const lines = ["*BRN Skins — Cotação*", ""];
    lines.push("Itens da loja:");
    for (const l of store) lines.push(`• ${l.qty > 1 ? `${l.qty}x ` : ""}${l.item.name} — ${formatBRL(cnyOf(l.item, base) * (l.rate ?? rate) * l.qty)}`);
    if (upgrade && client.length) {
      lines.push("", "Seus itens (upgrade):");
      for (const l of client) lines.push(`• ${l.item.name} — ${formatBRL(cnyOf(l.item, base) * rate * (1 - l.discount / 100))}`);
      lines.push("", `Total da loja: ${formatBRL(totals.storeBrl)}`, `Seus itens: ${formatBRL(totals.clientBrl)}`);
      lines.push(totals.pix >= 0 ? `*Você paga (PIX): ${formatBRL(totals.pix)}*` : `*Você recebe (PIX): ${formatBRL(-totals.pix)}*`);
    } else {
      lines.push("", `*Total (PIX): ${formatBRL(totals.storeBrl)}*`);
    }
    return lines.join("\n");
  };
  const bump = () => setToday((v) => v + 1);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(quoteText());
      bump();
      toast("Cotação copiada — é só colar no WhatsApp");
    } catch {
      toast("Não foi possível copiar", "error");
    }
  };

  const exportImage = () => {
    const rows = [
      ...store.map((l) => ({ label: `${l.qty > 1 ? `${l.qty}x ` : ""}${shortName(l.item.name)}`, value: formatBRL(cnyOf(l.item, base) * (l.rate ?? rate) * l.qty), muted: false })),
      ...(upgrade ? client.map((l) => ({ label: `↩ ${shortName(l.item.name)} (-${l.discount}%)`, value: `- ${formatBRL(cnyOf(l.item, base) * rate * (1 - l.discount / 100))}`, muted: true })) : []),
    ];
    const W = 1080;
    const H = 260 + rows.length * 64 + 170;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0a0b0d";
    g.fillRect(0, 0, W, H);
    const grad = g.createRadialGradient(W, 0, 0, W, 0, 700);
    grad.addColorStop(0, "rgba(230,0,35,0.35)");
    grad.addColorStop(1, "rgba(230,0,35,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#ff2d4b";
    g.font = "italic 900 54px Inter, Arial, sans-serif";
    g.fillText("BRN SKINS", 64, 110);
    g.fillStyle = "#c9cad0";
    g.font = "500 28px Inter, Arial, sans-serif";
    g.fillText(`Cotação · ${new Date().toLocaleDateString("pt-BR")}`, 64, 160);
    let y = 240;
    for (const r of rows) {
      g.fillStyle = "rgba(255,255,255,0.06)";
      g.fillRect(64, y + 22, W - 128, 1);
      g.fillStyle = r.muted ? "#96979f" : "#f5f5f5";
      g.font = "500 28px Inter, Arial, sans-serif";
      const label = r.label.length > 52 ? `${r.label.slice(0, 51)}…` : r.label;
      g.fillText(label, 64, y);
      g.textAlign = "right";
      g.font = "700 28px Inter, Arial, sans-serif";
      g.fillText(r.value, W - 64, y);
      g.textAlign = "left";
      y += 64;
    }
    y += 40;
    g.fillStyle = "#e60023";
    g.beginPath();
    g.roundRect(64, y - 56, W - 128, 96, 24);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "600 30px Inter, Arial, sans-serif";
    const pixLabel = upgrade && client.length ? (totals.pix >= 0 ? "Você paga (PIX)" : "Você recebe (PIX)") : "Total (PIX)";
    g.fillText(pixLabel, 100, y + 2);
    g.textAlign = "right";
    g.font = "800 40px Inter, Arial, sans-serif";
    g.fillText(formatBRL(Math.abs(upgrade && client.length ? totals.pix : totals.storeBrl)), W - 100, y + 6);
    g.textAlign = "left";
    const a = document.createElement("a");
    a.download = `cotacao-brn-${Date.now()}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
    bump();
  };

  if (!configured) {
    return <p className="card-premium p-6 text-[13.5px] text-muted">Rode a sincronização em Preços de mercado para carregar os preços e a cotação do yuan.</p>;
  }

  const hasItems = store.length > 0 || (upgrade && client.length > 0);
  const chip = (active: boolean) =>
    cn("h-7 rounded-full px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors", active ? "bg-white text-black" : "border border-white/[0.1] text-fg-2 hover:border-white/[0.22] hover:text-white");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-[640px] text-[13px] text-muted">
          Cote itens específicos: busque pelo nome ou cole uma lista. O preço sai do mercado base em ¥ × a sua cotação. Ligue o modo upgrade para abater as
          skins do cliente e ver quanto ele paga no PIX.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Yuan hoje", value: `R$ ${n2(yuanToday, 4)}` },
            { label: "Sua cotação", value: `R$ ${n2(rate)}` },
            { label: "Cotações hoje", value: formatInt(today) },
          ].map((k) => (
            <div key={k.label} className="card-premium min-w-[130px] px-4 py-3">
              <p className="text-[11px] text-muted">{k.label}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Modo upgrade */}
          <label className="flex w-fit cursor-pointer items-center gap-3">
            <input type="checkbox" className="studio-switch" checked={upgrade} onChange={(e) => setUpgrade(e.target.checked)} aria-label="Modo upgrade" />
            <span>
              <span className="block text-[13.5px] font-semibold">Modo upgrade</span>
              <span className="block text-[11.5px] text-muted">Troca com volta no PIX — mostra os itens do cliente.</span>
            </span>
          </label>

          {/* Itens da loja */}
          <section className="card-premium p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14.5px] font-semibold">
                <span className="size-1.5 rounded-full bg-primary" /> Itens da loja
              </h2>
              <span className="text-[12px] text-muted">
                {store.reduce((s, l) => s + l.qty, 0)} {store.reduce((s, l) => s + l.qty, 0) === 1 ? "item" : "itens"}
              </span>
            </div>
            <ItemPicker onAdd={addStore} placeholder="Buscar skin pelo nome… (ex.: karambit tiger tooth fn)" initialQuery={initialQuery} />
            <ul className="mt-3 space-y-2">
              {store.map((l, i) => {
                const cny = cnyOf(l.item, base);
                const lineRate = l.rate ?? rate;
                return (
                  <li key={l.item.key} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-white/[0.06] bg-black/20 p-3">
                    <span className="relative h-11 w-14 shrink-0">{l.item.image && <Image src={l.item.image} alt="" fill sizes="56px" className="object-contain" />}</span>
                    <div className="min-w-[200px] flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-medium">
                        <span className="truncate">{l.item.name}</span>
                        {l.item.wear !== "-" && (
                          <span className="text-[10.5px] font-bold" style={{ color: WEAR_COLORS[l.item.wear as WearCode] }}>
                            {l.item.wear}
                          </span>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        <span className="tabular-nums">
                          {BASE_LABEL[usedBase(l.item, base)]} {fmtCny(cny)}
                        </span>
                        <span className="text-faint">· cotação</span>
                        {RATE_PRESETS.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setStore((s) => s.map((x, j) => (j === i ? { ...x, rate: v === rate ? null : v } : x)))}
                            className={chip(lineRate === v)}
                          >
                            {n2(v)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={l.qty}
                        onChange={(e) => setStore((s) => s.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Math.min(99, Number(e.target.value) || 1)) } : x)))}
                        aria-label="Quantidade"
                        className="h-8 w-12 rounded-[8px] border border-white/[0.1] bg-black/30 text-center text-[12.5px] outline-none"
                      />
                      <span className="min-w-[110px] rounded-[10px] border border-white/[0.08] px-3 py-1.5 text-right text-[13.5px] font-semibold tabular-nums">
                        {money(cny * lineRate * l.qty, cny * l.qty)}
                      </span>
                      <button type="button" onClick={() => setStore((s) => s.filter((_, j) => j !== i))} aria-label={`Remover ${l.item.name}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-white/[0.06] hover:text-white">
                        <X size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
              {!store.length && <li className="rounded-[12px] border border-dashed border-white/[0.08] px-4 py-6 text-center text-[12.5px] text-muted">Nenhum item ainda — busque pelo nome ou cole uma lista acima.</li>}
            </ul>
          </section>

          {/* Itens do cliente */}
          {upgrade && (
            <section className="card-premium p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[14.5px] font-semibold">
                  <span className="size-1.5 rounded-full bg-white/60" /> Itens do cliente
                </h2>
                <span className="text-[12px] text-muted">{client.length} {client.length === 1 ? "item" : "itens"}</span>
              </div>
              <ItemPicker onAdd={addClient} placeholder="Skins que o cliente vai dar…" />
              <ul className="mt-3 space-y-2">
                {client.map((l, i) => {
                  const cny = cnyOf(l.item, base);
                  return (
                    <li key={l.item.key} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-white/[0.06] bg-black/20 p-3">
                      <span className="relative h-11 w-14 shrink-0">{l.item.image && <Image src={l.item.image} alt="" fill sizes="56px" className="object-contain" />}</span>
                      <div className="min-w-[200px] flex-1">
                        <p className="truncate text-[13px] font-medium">{l.item.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                          <span className="tabular-nums">
                            {BASE_LABEL[usedBase(l.item, base)]} {fmtCny(cny)}
                          </span>
                          <span className="text-faint">· desconto</span>
                          {DISCOUNTS.map((d) => (
                            <button key={d} type="button" onClick={() => setClient((s) => s.map((x, j) => (j === i ? { ...x, discount: d } : x)))} className={chip(l.discount === d)}>
                              {d}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="min-w-[110px] rounded-[10px] border border-white/[0.08] px-3 py-1.5 text-right text-[13.5px] font-semibold tabular-nums">
                        {money(cny * rate * (1 - l.discount / 100), cny * (1 - l.discount / 100))}
                      </span>
                      <button type="button" onClick={() => setClient((s) => s.filter((_, j) => j !== i))} aria-label={`Remover ${l.item.name}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-white/[0.06] hover:text-white">
                        <X size={15} />
                      </button>
                    </li>
                  );
                })}
                {!client.length && <li className="rounded-[12px] border border-dashed border-white/[0.08] px-4 py-6 text-center text-[12.5px] text-muted">Adicione as skins que o cliente vai dar como parte do pagamento.</li>}
              </ul>
            </section>
          )}
        </div>

        {/* Resumo */}
        <aside className="card-premium p-5 xl:sticky xl:top-[84px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Resumo da cotação</h2>
            <div className="flex rounded-full border border-white/[0.08] bg-black/30 p-0.5">
              {(["CNY", "BRL"] as Currency[]).map((c) => (
                <button key={c} type="button" onClick={() => setCurrency(c)} className={cn("h-6 rounded-full px-2.5 text-[11.5px] font-semibold", currency === c ? "bg-white text-black" : "text-muted")}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 text-[12.5px]">
            <span className="text-fg-2">Mercado base</span>
            <div className="flex rounded-full border border-white/[0.08] bg-black/30 p-0.5">
              {(["buff163", "c5game"] as Base[]).map((b) => (
                <button key={b} type="button" onClick={() => setBase(b)} className={cn("h-7 rounded-full px-3 text-[12px] font-semibold", base === b ? "bg-white text-black" : "text-muted hover:text-fg")}>
                  {BASE_LABEL[b]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[12.5px] text-fg-2">Cotação (R$ por ¥)</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {RATE_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setRate(v);
                    setRateInput(n2(v));
                  }}
                  className={chip(rate === v)}
                >
                  {n2(v)}
                </button>
              ))}
              <input
                inputMode="decimal"
                value={rateInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.,]/g, "");
                  setRateInput(raw);
                  const v = Number(raw.replace(",", "."));
                  if (v > 0 && v < 5) setRate(v);
                }}
                aria-label="Cotação (R$ por ¥)"
                className="h-7 w-[64px] rounded-full border border-white/[0.1] bg-black/30 text-center text-[12px] font-semibold outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="flex items-center gap-2 text-fg-2">
                <span className="size-1.5 rounded-full bg-primary" /> Itens da loja · {store.reduce((s, l) => s + l.qty, 0)}
              </dt>
              <dd className="font-semibold tabular-nums">{money(totals.storeBrl, totals.storeCny)}</dd>
            </div>
            {upgrade && (
              <div className="flex justify-between">
                <dt className="flex items-center gap-2 text-fg-2">
                  <span className="size-1.5 rounded-full bg-white/60" /> Itens do cliente · {client.length}
                </dt>
                <dd className="font-semibold tabular-nums">- {money(totals.clientBrl, totals.clientCny)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex items-center justify-between rounded-[12px] border border-primary/40 bg-primary/[0.08] px-3.5 py-3">
            <span className="text-[13px] font-semibold">{upgrade && totals.pix < 0 ? "Cliente recebe (PIX)" : "Cliente paga (PIX)"}</span>
            <span className="text-[18px] font-bold tabular-nums">{formatBRL(Math.abs(upgrade ? totals.pix : totals.storeBrl))}</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-1.5 text-fg-2" title="Sua cotação acima do yuan do dia nos itens da loja + desconto aplicado nos itens do cliente">
              Lucro do repasse <Info size={13} className="text-faint" />
            </span>
            <span className={cn("font-semibold tabular-nums", totals.profit >= 0 ? "text-[#4ade80]" : "text-[#ff6b7d]")}>{formatBRL(totals.profit)}</span>
          </div>

          <div className="mt-5 space-y-2">
            <button type="button" disabled={!hasItems} onClick={copy} className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:opacity-40">
              <ClipboardCopy size={15} /> Copiar cotação
            </button>
            <button type="button" disabled={!hasItems} onClick={exportImage} className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] text-[13.5px] font-medium text-fg-2 hover:border-white/[0.24] hover:text-white disabled:opacity-40">
              <Download size={15} /> Exportar como imagem
            </button>
            {hasItems && (
              <button
                type="button"
                onClick={() => {
                  setStore([]);
                  setClient([]);
                }}
                className="flex h-9 w-full items-center justify-center gap-2 text-[12.5px] text-muted hover:text-white"
              >
                <Trash2 size={14} /> Limpar cotação
              </button>
            )}
          </div>
          {!hasItems && <p className="mt-3 text-center text-[11.5px] text-faint">Adicione itens para ver os totais.</p>}
          <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-faint">
            Preços de BUFF163 e C5Game em ¥ da última sincronização (atualizada uma vez por dia). Sem preço no mercado base, usa o outro.
          </p>
        </aside>
      </div>
    </div>
  );
}
