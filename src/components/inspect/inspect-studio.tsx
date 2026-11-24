"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Crosshair,
  Dices,
  Expand,
  Eye,
  EyeOff,
  Gem,
  Hand,
  KeyRound,
  Map as MapIcon,
  Minimize,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sticker,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import type { Skin } from "@/types/catalog";
import { siteConfig } from "@/config/site";
import { WEARS } from "@/config/catalog";
import { cn } from "@/lib/cn";
import { getOffer, skinDisplayName } from "@/lib/skin";
import {
  AGENT_LOOPS,
  AGENT_MODELS,
  AGENT_ONE_SHOTS,
  CS2INSPECT,
  DOPPLER_PHASES,
  LIMITS,
  SCENES,
  hasCs2InspectKey,
} from "@/integrations/cs2inspect/config";
import { charmSpec, compactSpec, emptySticker, hasPatches, stickersSpec, type StickerSlot } from "@/integrations/cs2inspect/spec";
import type { AgentLoopAnim, DopplerPhase, InspectScene, InspectSpec, InspectViewMode } from "@/integrations/cs2inspect/types";
import { useCs2Inspect } from "@/integrations/cs2inspect/use-cs2inspect";

const VIEWER_ID = "brn-inspect-viewer";
/** Cor de fundo do "Estúdio BRN" (quando nenhum mapa está selecionado) */
const STUDIO_BG = "0a0b0d";

interface StudioState {
  skinId: string | null;
  name: string;
  label: string;
  phase: DopplerPhase | null;
  wear: number;
  seed: number;
  st: boolean;
  nametag: string;
  stickers: StickerSlot[];
  charmIndex: number | null;
  charmSeed: number | null;
  view: InspectViewMode;
  agent: string;
  patches: (number | null)[];
  anim: AgentLoopAnim;
  gloves: string | null;
  glovewear: number;
  scene: InspectScene | null;
  spin: number;
  card: boolean;
}

const wearOf = (f: number) => WEARS.find((w) => f >= w.minFloat && f < w.maxFloat) ?? WEARS[WEARS.length - 1]!;
const isDoppler = (name: string) => /doppler/i.test(name);

function toSpec(s: StudioState): InspectSpec {
  return compactSpec({
    name: s.name,
    phase: s.phase && isDoppler(s.name) ? s.phase : undefined,
    wear: s.wear,
    seed: s.seed,
    stattrak: s.st,
    nametag: s.nametag.trim() || undefined,
    stickers: stickersSpec(s.stickers),
    charm: charmSpec(s.charmIndex, s.charmSeed) ?? undefined,
    view: s.view,
    agent: s.view === "agent" ? s.agent : undefined,
    patches: s.view === "agent" && hasPatches(s.patches) ? s.patches : undefined,
    anim: s.view === "agent" ? s.anim : undefined,
    gloves: s.gloves ?? undefined,
    glovewear: s.gloves ? s.glovewear : undefined,
    scene: s.scene ?? undefined,
    spin: s.spin,
    card: s.card,
    controls: 0,
    interactive: true,
    bg: STUDIO_BG,
    accent: CS2INSPECT.accent,
    loader: "bar",
    logopos: "br",
  });
}

/* ------------------------------------------------------------------ UI */

function Glass({ children, className, ...rest }: { children: ReactNode; className?: string; "data-part"?: string }) {
  return (
    // Sem sombra externa: o navegador conta a sombra como "desenhada por cima" do visualizador,
    // e ela não pode alcançar a marca nem o cartão do CS2Inspect.
    <div {...rest} className={cn("rounded-[14px] border border-white/[0.07] bg-[#08090b]/80 backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  kbd,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  kbd?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={kbd ? `${label} (${kbd})` : label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "group relative grid size-[42px] place-items-center rounded-[11px] transition-colors disabled:opacity-35",
        active ? "bg-primary text-white shadow-[0_0_14px_-4px_rgb(230_0_35/0.9)]" : "text-fg-2 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <Icon size={19} strokeWidth={1.9} />
      <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-[7px] bg-[#111215] px-2 py-1 text-[11.5px] font-semibold text-fg opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 lg:block">
        {label}
        {kbd && <span className="ml-1.5 text-faint">{kbd}</span>}
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: ReactNode;
  disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={cn("block", disabled && "opacity-40")}>
      <span className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-fg-2">{label}</span>
        <span className="tabular-nums text-fg">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range mt-2 w-full"
        style={{ background: `linear-gradient(90deg, #e60023 ${pct}%, #1e1f24 ${pct}%)` }}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-fg-2">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value === "") return onChange(null);
          let n = Number(e.target.value);
          if (min !== undefined) n = Math.max(min, n);
          if (max !== undefined) n = Math.min(max, n);
          onChange(n);
        }}
        className="mt-1 h-9 w-full rounded-[8px] border border-white/[0.08] bg-black/40 px-2.5 text-[13px] text-fg outline-none focus:border-primary/60"
      />
    </label>
  );
}

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{title}</h3>
        {hint && <p className="mt-0.5 text-[11.5px] leading-snug text-fg-2">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ Busca */

function SkinSearch({
  skins,
  current,
  onPick,
  onPickName,
}: {
  skins: Skin[];
  current: string;
  onPick: (s: Skin) => void;
  onPickName: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    const tokens = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
    const list = tokens.length
      ? skins.filter((s) => {
          const hay = `${skinDisplayName(s)} ${s.marketName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return tokens.every((t) => hay.includes(t));
        })
      : skins;
    return list.slice(0, 8);
  }, [skins, term]);

  return (
    <div ref={ref} className="relative w-full">
      <label className="flex h-[42px] items-center rounded-[12px] border border-white/[0.08] bg-[#08090b]/85 px-3.5 backdrop-blur-xl focus-within:border-primary/60">
        <Search size={17} className="shrink-0 text-fg-2" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              onPick(results[0]);
              setOpen(false);
              setQ("");
            }
          }}
          placeholder={current || "Buscar skin do catálogo..."}
          aria-label="Buscar skin para inspecionar"
          className="ml-2.5 h-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-fg-2"
        />
      </label>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#0b0c0f]/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onPick(s);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left hover:bg-white/[0.06]"
              >
                <span className="relative h-8 w-12 shrink-0">
                  <Image src={s.image} alt="" fill sizes="48px" className="object-contain" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{skinDisplayName(s)}</span>
              </button>
            ))}
            {term.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  onPickName(q.trim());
                  setOpen(false);
                  setQ("");
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-[9px] border-t border-white/[0.06] px-2 py-2 text-left text-[12.5px] text-fg-2 hover:bg-white/[0.06] hover:text-fg"
              >
                <Search size={14} /> Inspecionar “{q.trim()}” pelo nome de mercado da Steam
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ Estúdio */

type Tab = "skin" | "stickers" | "charm" | "gloves" | "agent" | "map";
const TABS: { id: Tab; label: string; icon: typeof Eye }[] = [
  { id: "skin", label: "Skin", icon: Paintbrush },
  { id: "stickers", label: "Adesivos", icon: Sticker },
  { id: "charm", label: "Amuleto", icon: Gem },
  { id: "gloves", label: "Luvas", icon: Hand },
  { id: "agent", label: "Agente", icon: UserRound },
  { id: "map", label: "Mapa", icon: MapIcon },
];

export function InspectStudio({ skins }: { skins: Skin[] }) {
  const keyReady = hasCs2InspectKey();
  const { view, status, error, mount } = useCs2Inspect(VIEWER_ID, keyReady);
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [tab, setTab] = useState<Tab>("skin");
  const [uiHidden, setUiHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const gloves = useMemo(() => skins.filter((s) => s.category === "gloves"), [skins]);

  const initial = useMemo<StudioState>(() => {
    const first = skins[0];
    return {
      skinId: first?.id ?? null,
      name: first?.marketName ?? "AK-47 | Redline",
      label: first ? skinDisplayName(first) : "AK-47 | Redline",
      phase: null,
      wear: first ? getOffer(first).float : 0.06,
      seed: 1,
      st: false,
      nametag: "",
      stickers: Array.from({ length: LIMITS.stickerSlots }, emptySticker),
      charmIndex: null,
      charmSeed: null,
      view: "item",
      agent: AGENT_MODELS[0]!.id,
      patches: [null, null, null],
      anim: "idle",
      gloves: null,
      glovewear: 0.15,
      scene: null,
      spin: 0,
      card: true,
    };
  }, [skins]);

  const [state, setState] = useState<StudioState>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* Montagem inicial — lê os dados enviados pelo marketplace (?skin=&wear=&seed=&st=) */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const skin = skins.find((s) => s.id === p.get("skin") || s.slug === p.get("skin"));
    const next: StudioState = { ...initial };
    if (skin) {
      next.skinId = skin.id;
      next.name = skin.marketName;
      next.label = skinDisplayName(skin);
      next.wear = getOffer(skin).float;
    } else if (p.get("name")) {
      next.skinId = null;
      next.name = p.get("name")!.slice(0, 120);
      next.label = next.name;
    }
    const wear = Number(p.get("wear"));
    if (p.get("wear") && wear >= 0 && wear <= 1) next.wear = wear;
    const seed = Number(p.get("seed"));
    if (p.get("seed") && seed >= 0 && seed <= LIMITS.seedMax) next.seed = Math.round(seed);
    if (p.get("st") === "1") next.st = true;
    setState(next);
    stateRef.current = next;
    if (keyReady) void mount(toSpec(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const later = useCallback((key: string, fn: () => void, ms = 140) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  }, []);

  const remount = useCallback(() => {
    if (keyReady) void mount(toSpec(stateRef.current));
  }, [keyReady, mount]);

  const patch = useCallback((p: Partial<StudioState>) => {
    setState((s) => {
      const n = { ...s, ...p };
      stateRef.current = n;
      return n;
    });
  }, []);

  /* ---- ações reais do SDK ---- */
  const v = () => (status === "ready" || status === "loading" ? view.current : null);

  const pickSkin = (s: Skin) => {
    const wear = getOffer(s).float;
    patch({ skinId: s.id, name: s.marketName, label: skinDisplayName(s), wear, phase: null });
    v()?.update({ name: s.marketName, wear, seed: stateRef.current.seed, stattrak: stateRef.current.st });
  };
  const pickName = (name: string) => {
    patch({ skinId: null, name, label: name, phase: null });
    v()?.update({ name });
  };
  const setWear = (wear: number) => {
    patch({ wear });
    later("wear", () => v()?.update({ wear }));
  };
  const setSeed = (seed: number) => {
    patch({ seed });
    later("seed", () => v()?.update({ seed }));
  };
  const setSt = (st: boolean) => {
    patch({ st });
    v()?.update({ stattrak: st });
  };
  const setPhase = (phase: DopplerPhase) => {
    patch({ phase });
    v()?.update({ phase });
  };
  const setNametag = (nametag: string) => {
    const value = nametag.slice(0, LIMITS.nametagMax);
    patch({ nametag: value });
    later("nametag", () => (value.trim() ? v()?.update({ nametag: value.trim() }) : remount()), 500);
  };
  const setSticker = (i: number, p: Partial<StickerSlot>) => {
    const stickers = stateRef.current.stickers.map((s, idx) => (idx === i ? { ...s, ...p } : s));
    patch({ stickers });
    later("stickers", () => v()?.update({ stickers: stickersSpec(stickers) }), 350);
  };
  const setCharm = (charmIndex: number | null, charmSeed: number | null) => {
    patch({ charmIndex, charmSeed });
    later("charm", () => v()?.update({ charm: charmSpec(charmIndex, charmSeed) ?? "none" }), 350);
  };
  const setMode = (mode: InspectViewMode) => {
    patch({ view: mode });
    if (mode === "agent") v()?.setAgent(stateRef.current.agent, stateRef.current.patches);
    v()?.setView(mode);
  };
  const setAgentModel = (agent: string) => {
    patch({ agent, view: "agent" });
    v()?.setAgent(agent, stateRef.current.patches);
    if (stateRef.current.view !== "agent") v()?.setView("agent");
  };
  const setPatch = (i: number, value: number | null) => {
    const patches = stateRef.current.patches.map((p, idx) => (idx === i ? value : p));
    patch({ patches });
    later("patches", () => v()?.setPatches(patches), 350);
  };
  const setAnim = (anim: AgentLoopAnim) => {
    patch({ anim });
    v()?.update({ anim });
  };
  const pickGloves = (name: string) => {
    patch({ gloves: name });
    v()?.setGloves(name, stateRef.current.glovewear);
    if (stateRef.current.view === "item") setMode("hands");
  };
  const setGlovewear = (glovewear: number) => {
    patch({ glovewear });
    const g = stateRef.current.gloves;
    if (g) later("glovewear", () => v()?.setGloves(g, glovewear));
  };
  const removeGloves = () => {
    patch({ gloves: null });
    v()?.setGloves("none");
  };
  const pickScene = (scene: InspectScene | null) => {
    patch({ scene });
    v()?.setScene(scene ?? "none");
  };
  const toggleSpin = () => {
    const spin = stateRef.current.spin ? 0 : 24;
    patch({ spin });
    v()?.update({ spin });
  };
  const toggleCard = () => {
    const card = !stateRef.current.card;
    patch({ card });
    v()?.update({ card });
  };
  const toggleUi = useCallback(() => {
    setUiHidden((h) => {
      view.current?.setUi(h);
      return !h;
    });
  }, [view]);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      /* navegador recusou */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (e.key.toLowerCase() === "h") toggleUi();
    };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, [toggleUi]);

  const disabled = !keyReady || status === "error";
  const wear = wearOf(state.wear);

  /* ---- conteúdo das abas ---- */
  const panel: Record<Tab, ReactNode> = {
    skin: (
      <div className="space-y-5">
        <Section title="Skin selecionada">
          <p className="text-[14px] font-semibold leading-snug">{state.label}</p>
        </Section>
        <Section title="Desgaste" hint="O CS2Inspect limita o float à faixa permitida da skin.">
          <Slider
            label="Float"
            value={state.wear}
            min={0}
            max={1}
            step={0.0001}
            onChange={setWear}
            disabled={disabled}
            display={
              <>
                <span className="mr-1.5 rounded-[4px] bg-white/[0.07] px-1 text-[10.5px] font-bold">{wear.code}</span>
                {state.wear.toFixed(4)}
              </>
            }
          />
          <div className="flex flex-wrap gap-1">
            {WEARS.map((w) => (
              <button
                key={w.code}
                type="button"
                disabled={disabled}
                onClick={() => setWear(Number(((w.minFloat + w.maxFloat) / 2).toFixed(4)))}
                className={cn("h-7 rounded-[6px] px-2 text-[11px] font-bold", wear.code === w.code ? "bg-primary/20 text-white ring-1 ring-primary/60" : "bg-white/[0.05] text-fg-2 hover:text-fg")}
              >
                {w.code}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Pattern seed">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Slider label="Seed" value={state.seed} min={0} max={LIMITS.seedMax} step={1} onChange={setSeed} disabled={disabled} />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setSeed(Math.floor(Math.random() * (LIMITS.seedMax + 1)))}
              aria-label="Seed aleatória"
              className="grid size-9 place-items-center rounded-[8px] bg-white/[0.06] text-fg-2 hover:text-fg disabled:opacity-40"
            >
              <Dices size={17} />
            </button>
          </div>
          <NumberField label="Valor exato (0–1000)" value={state.seed} min={0} max={LIMITS.seedMax} onChange={(n) => setSeed(n ?? 0)} />
        </Section>
        {isDoppler(state.name) && (
          <Section title="Fase Doppler">
            <div className="grid grid-cols-4 gap-1">
              {DOPPLER_PHASES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPhase(p.id)}
                  className={cn("h-8 rounded-[6px] text-[11px] font-semibold", (state.phase ?? "1") === p.id ? "bg-primary/20 text-white ring-1 ring-primary/60" : "bg-white/[0.05] text-fg-2")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>
        )}
        <Section title="Extras">
          <label className="flex items-center justify-between rounded-[10px] bg-white/[0.04] px-3 py-2.5">
            <span className="text-[13px] font-semibold">
              <span className="text-[#ff9a5c]">StatTrak™</span>
              <span className="block text-[11.5px] font-normal text-fg-2">Mostra o contador na arma</span>
            </span>
            <input type="checkbox" checked={state.st} disabled={disabled} onChange={(e) => setSt(e.target.checked)} className="studio-switch" aria-label="StatTrak" />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-fg-2">Name tag (até 20 caracteres)</span>
            <input
              value={state.nametag}
              disabled={disabled}
              maxLength={LIMITS.nametagMax}
              onChange={(e) => setNametag(e.target.value)}
              placeholder="BRN Skins"
              className="mt-1 h-9 w-full rounded-[8px] border border-white/[0.08] bg-black/40 px-2.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
        </Section>
      </div>
    ),
    stickers: (
      <Section title="Adesivos" hint="Use o número do adesivo (o mesmo do link de inspeção da Steam). Posição (deslocamento a partir do centro do slot) e rotação são opcionais.">
        <div className="space-y-2.5">
          {state.stickers.map((s, i) => (
            <div key={i} className="rounded-[10px] border border-white/[0.06] bg-black/30 p-2.5">
              <div className="flex items-end gap-2">
                <span className="mb-2 grid size-6 shrink-0 place-items-center rounded-[6px] bg-white/[0.06] text-[11px] font-bold text-fg-2">{i + 1}</span>
                <div className="flex-1">
                  <NumberField label={`Slot ${i + 1} · nº do adesivo`} value={s.index} min={1} placeholder="ex.: 5032" onChange={(n) => setSticker(i, { index: n })} />
                </div>
                {s.index && (
                  <button type="button" onClick={() => setSticker(i, emptySticker())} aria-label={`Remover adesivo do slot ${i + 1}`} className="mb-0.5 grid size-9 place-items-center rounded-[8px] text-fg-2 hover:bg-white/[0.06] hover:text-fg">
                    <X size={15} />
                  </button>
                )}
              </div>
              {s.index && (
                <div className="mt-3 space-y-3">
                  <Slider label="Rotação" value={s.rotation} min={-180} max={180} step={1} onChange={(r) => setSticker(i, { rotation: r })} display={`${s.rotation}°`} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Posição X" value={s.x} step={0.01} onChange={(n) => setSticker(i, { x: n ?? 0 })} />
                    <NumberField label="Posição Y" value={s.y} step={0.01} onChange={(n) => setSticker(i, { y: n ?? 0 })} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    ),
    charm: (
      <Section title="Amuleto" hint="Número do amuleto (keychain) e, opcionalmente, a seed do padrão (1–100000).">
        <NumberField label="Nº do amuleto" value={state.charmIndex} min={1} placeholder="ex.: 1" onChange={(n) => setCharm(n, stateRef.current.charmSeed)} />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <NumberField label="Seed do amuleto" value={state.charmSeed} min={1} max={LIMITS.charmSeedMax} onChange={(n) => setCharm(stateRef.current.charmIndex, n)} />
          </div>
          <button
            type="button"
            disabled={!state.charmIndex}
            onClick={() => setCharm(stateRef.current.charmIndex, 1 + Math.floor(Math.random() * LIMITS.charmSeedMax))}
            aria-label="Seed aleatória do amuleto"
            className="grid size-9 place-items-center rounded-[8px] bg-white/[0.06] text-fg-2 hover:text-fg disabled:opacity-40"
          >
            <Dices size={17} />
          </button>
        </div>
        {state.charmIndex && (
          <button type="button" onClick={() => setCharm(null, null)} className="text-[12px] font-semibold text-primary hover:text-primary-hover">
            Remover amuleto
          </button>
        )}
      </Section>
    ),
    gloves: (
      <Section title="Luvas" hint="Aparecem no modo primeira pessoa.">
        <div className="grid grid-cols-1 gap-1.5">
          {gloves.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={disabled}
              onClick={() => pickGloves(g.marketName)}
              className={cn(
                "flex items-center gap-3 rounded-[10px] border px-2 py-1.5 text-left transition-colors disabled:opacity-40",
                state.gloves === g.marketName ? "border-primary/70 bg-primary/10" : "border-white/[0.06] bg-black/30 hover:border-white/15",
              )}
            >
              <span className="relative h-9 w-12 shrink-0">
                <Image src={g.image} alt="" fill sizes="48px" className="object-contain" />
              </span>
              <span className="text-[12.5px] font-semibold">{skinDisplayName(g)}</span>
            </button>
          ))}
        </div>
        <Slider label="Desgaste das luvas" value={state.glovewear} min={0} max={1} step={0.01} onChange={setGlovewear} disabled={!state.gloves} display={state.glovewear.toFixed(2)} />
        {state.gloves && (
          <button type="button" onClick={removeGloves} className="text-[12px] font-semibold text-primary hover:text-primary-hover">
            Remover luvas
          </button>
        )}
      </Section>
    ),
    agent: (
      <div className="space-y-5">
        <Section title="Agente" hint="Visão em terceira pessoa segurando a skin.">
          <div className="grid gap-1.5">
            {AGENT_MODELS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled}
                onClick={() => setAgentModel(a.id)}
                className={cn(
                  "h-10 rounded-[10px] border px-3 text-left text-[13px] font-semibold transition-colors disabled:opacity-40",
                  state.view === "agent" && state.agent === a.id ? "border-primary/70 bg-primary/10" : "border-white/[0.06] bg-black/30 hover:border-white/15",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Animação">
          <div className="grid grid-cols-2 gap-1.5">
            {AGENT_LOOPS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled || state.view !== "agent"}
                onClick={() => setAnim(a.id)}
                className={cn("h-8 rounded-[8px] text-[12px] font-semibold disabled:opacity-40", state.anim === a.id ? "bg-primary/20 text-white ring-1 ring-primary/60" : "bg-white/[0.05] text-fg-2")}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {AGENT_ONE_SHOTS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled || state.view !== "agent"}
                onClick={() => v()?.play(a.id)}
                className="h-8 rounded-[8px] bg-white/[0.08] text-[11px] font-semibold text-fg hover:bg-white/[0.12] disabled:opacity-40"
              >
                {a.label}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Patches do agente" hint="Até 3 slots, pelo número do patch.">
          <div className="grid grid-cols-3 gap-2">
            {state.patches.map((p, i) => (
              <NumberField key={i} label={`Slot ${i + 1}`} value={p} min={1} onChange={(n) => setPatch(i, n)} />
            ))}
          </div>
        </Section>
      </div>
    ),
    map: (
      <Section title="Mapa" hint="Cenários oficiais do visualizador.">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => pickScene(null)}
            className={cn("h-9 rounded-[8px] text-[12px] font-semibold disabled:opacity-40", !state.scene ? "bg-primary/20 text-white ring-1 ring-primary/60" : "bg-white/[0.05] text-fg-2")}
          >
            Estúdio BRN
          </button>
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => pickScene(s.id)}
              className={cn("h-9 rounded-[8px] text-[12px] font-semibold disabled:opacity-40", state.scene === s.id ? "bg-primary/20 text-white ring-1 ring-primary/60" : "bg-white/[0.05] text-fg-2 hover:text-fg")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>
    ),
  };

  const tabs = (
    <div className="flex gap-1 border-b border-white/[0.06] p-1.5" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          title={t.label}
          className={cn(
            "flex h-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-[9px] text-[10px] font-semibold transition-colors",
            tab === t.id ? "bg-white/[0.08] text-white" : "text-fg-2 hover:text-fg",
          )}
        >
          <t.icon size={16} />
          {t.label}
        </button>
      ))}
    </div>
  );

  const isHands = state.view === "hands";
  const isAgent = state.view === "agent";
  const onlyFp = isHands || isAgent ? "" : " (1ª pessoa ou agente)";
  const actions = (
    <>
      <ToolButton icon={RotateCw} label="Inspeção 360° (auto)" active={state.spin > 0} onClick={toggleSpin} disabled={disabled} />
      <ToolButton icon={Sparkles} label={isHands ? "Animação de inspeção" : "Animação de inspeção (1ª pessoa)"} kbd="F" onClick={() => v()?.inspect()} disabled={disabled || !isHands} />
      <ToolButton icon={Crosshair} label={`Disparar${onlyFp}`} onClick={() => (isAgent ? v()?.play("fire") : v()?.fire(false))} disabled={disabled || (!isHands && !isAgent)} />
      <ToolButton icon={Zap} label={`Ataque secundário${onlyFp}`} onClick={() => (isAgent ? v()?.play("alt") : v()?.fire(true))} disabled={disabled || (!isHands && !isAgent)} />
      <ToolButton icon={RefreshCw} label={`Recarregar${onlyFp}`} kbd="R" onClick={() => (isAgent ? v()?.play("reload") : v()?.reload())} disabled={disabled || (!isHands && !isAgent)} />
      <ToolButton icon={RotateCcw} label="Resetar câmera" onClick={() => v()?.resetView()} disabled={disabled} />
      <ToolButton icon={SlidersHorizontal} label={state.card ? "Ocultar cartão de info" : "Mostrar cartão de info"} active={state.card} onClick={toggleCard} disabled={disabled} />
    </>
  );

  const modes = (
    <div className="flex gap-1 rounded-[12px] bg-white/[0.04] p-1" role="radiogroup" aria-label="Modo de visualização">
      {(
        [
          ["item", "360°", RotateCw],
          ["hands", "1ª pessoa", Crosshair],
          ["agent", "Agente", UserRound],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={state.view === id}
          disabled={disabled}
          onClick={() => setMode(id)}
          className={cn(
            "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-40",
            state.view === id ? "bg-primary text-white" : "text-fg-2 hover:text-fg",
          )}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className="relative h-dvh w-full overflow-hidden bg-[radial-gradient(70%_60%_at_50%_45%,#1a0a0d_0%,#08090b_60%,#040507_100%)] text-fg">
      {/* Visualizador (SDK oficial) */}
      <div id={VIEWER_ID} className="absolute inset-x-0 top-0 bottom-[calc(66px+env(safe-area-inset-bottom))] lg:bottom-0 [&_iframe]:!h-full [&_iframe]:!w-full [&_iframe]:border-0" />

      {/* Estados */}
      {!keyReady && <SetupCard />}
      {keyReady && status === "error" && error && (
        <div className="absolute left-1/2 top-1/2 z-20 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2">
          <Glass className="p-5 text-center">
            <p className="text-[15px] font-bold">Não foi possível carregar o 3D</p>
            <p className="mt-1.5 text-[13px] text-fg-2">{error.message}</p>
            <button type="button" onClick={remount} className="btn-solid-red mt-4 h-10 rounded-[9px] px-4 text-[13px] font-semibold">
              Tentar novamente
            </button>
          </Glass>
        </div>
      )}
      {/* O carregamento é indicado pela barra do próprio visualizador (loader="bar"); nada é desenhado por cima dele. */}

      <AnimatePresence>
        {!uiHidden && (
          <motion.div key="ui" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="pointer-events-none absolute inset-0 z-20">
            {/* Barra superior */}
            <div data-part="topbar" className="pointer-events-auto absolute inset-x-3 top-3 flex items-center gap-2 lg:inset-x-4 lg:top-4 lg:gap-3">
              <Link href="/" aria-label="Voltar ao catálogo" className="grid size-[42px] shrink-0 place-items-center rounded-[12px] border border-white/[0.08] bg-[#08090b]/85 backdrop-blur-xl hover:text-white">
                <ArrowLeft size={19} />
              </Link>
              <Link href="/" className="hidden shrink-0 items-center gap-2.5 sm:flex">
                <Image src={siteConfig.assets.logo} alt={siteConfig.name} width={297} height={160} className="h-[34px] w-auto" />
                <span className="text-[13px] font-bold tracking-[0.04em]">
                  INSPECT <span className="text-primary">3D</span>
                </span>
              </Link>
              <div className="mx-auto w-full max-w-[440px] min-w-0">
                <SkinSearch skins={skins} current={state.label} onPick={pickSkin} onPickName={pickName} />
              </div>
              <div className="flex shrink-0 gap-1 rounded-[12px] border border-white/[0.08] bg-[#08090b]/85 p-[3px] backdrop-blur-xl">
                <ToolButton icon={fullscreen ? Minimize : Expand} label={fullscreen ? "Sair da tela cheia" : "Tela cheia"} onClick={toggleFullscreen} />
                <ToolButton icon={EyeOff} label="Ocultar interface" kbd="H" onClick={toggleUi} />
              </div>
            </div>

            {/* Painel de ajustes (desktop) */}
            <Glass data-part="panel" className="pointer-events-auto absolute bottom-[104px] left-4 top-[76px] hidden w-[312px] flex-col overflow-hidden lg:flex">
              {tabs}
              <div className="scrollbar-thin flex-1 overflow-y-auto p-4">{panel[tab]}</div>
            </Glass>

            {/* Modos + ferramentas (barra inferior; a borda direita fica livre para a marca do CS2Inspect) */}
            <div data-part="bottombar" className="pointer-events-auto absolute left-1/2 top-[62px] flex -translate-x-1/2 flex-col-reverse items-center gap-2 lg:bottom-5 lg:left-[calc(50%+150px)] lg:top-auto lg:flex-col">
              {state.view === "hands" && (
                <p className="rounded-full bg-black/60 px-3 py-1 text-center text-[11.5px] text-fg-2 backdrop-blur">
                  Clique no 3D: <b className="text-fg">clique</b> dispara · <b className="text-fg">R</b> recarrega · <b className="text-fg">G</b> saca · <b className="text-fg">F</b> inspeciona
                </p>
              )}
              <Glass className="flex items-center gap-1 p-[3px]">
                {modes}
                <span className="mx-1 hidden h-7 w-px bg-white/10 lg:block" />
                <div className="hidden items-center gap-0.5 lg:flex">{actions}</div>
              </Glass>
            </div>

            {/* Mobile: barra inferior */}
            <div className="pointer-events-auto absolute inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
              <Glass className="scrollbar-none flex items-center gap-1 overflow-x-auto p-[5px]">
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="flex h-[42px] shrink-0 items-center gap-2 rounded-[11px] bg-primary px-3 text-[13px] font-semibold text-white"
                >
                  <SlidersHorizontal size={17} /> Ajustes
                </button>
                {actions}
              </Glass>
            </div>

            {/* Crédito obrigatório do fornecedor (a marca do CS2Inspect também aparece no próprio visualizador) */}
            <p data-part="credit" className="pointer-events-auto absolute left-3 top-[112px] max-w-[70vw] text-[10.5px] leading-snug text-faint lg:left-[340px] lg:top-[78px] lg:max-w-[360px]">
              3D por{" "}
              <a href={CS2INSPECT.siteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg-2 underline-offset-2 hover:underline">
                cs2inspect.skin
              </a>{" "}
              · visualizador não oficial; modelos e artes são da Valve.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {uiHidden && (
        <button
          type="button"
          onClick={toggleUi}
          className="absolute left-3 top-3 z-30 flex h-9 items-center gap-2 rounded-full bg-black/55 px-3 text-[12px] font-semibold text-fg-2 backdrop-blur hover:text-white"
        >
          <Eye size={15} /> Mostrar interface (H)
        </button>
      )}

      {/* Mobile: bottom sheet de ajustes */}
      <AnimatePresence>
        {sheetOpen && !uiHidden && (
          <>
            <motion.div className="absolute inset-0 z-30 bg-black/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheetOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Ajustes do visualizador"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 z-40 flex max-h-[72dvh] flex-col rounded-t-[18px] border-t border-white/[0.08] bg-[#08090b]/95 backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center justify-between px-3 pt-2">
                <span className="mx-auto h-1 w-10 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="min-w-0 flex-1">{tabs}</div>
                <button type="button" onClick={() => setSheetOpen(false)} aria-label="Fechar ajustes" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                  <X size={17} />
                </button>
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))]">{panel[tab]}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="absolute left-1/2 top-1/2 z-10 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2">
      <Glass className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[11px] bg-primary/15 text-primary ring-1 ring-primary/30">
            <KeyRound size={19} />
          </span>
          <div>
            <p className="text-[15px] font-bold">Configure a chave do CS2Inspect</p>
            <p className="text-[12.5px] text-fg-2">O visualizador 3D usa a API gratuita do cs2inspect.skin.</p>
          </div>
        </div>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[13px] text-fg-2">
          <li>Entre em cs2inspect.skin (Steam ou e-mail).</li>
          <li>No menu da conta, abra “API” e clique em “New key”.</li>
          <li>Em sites permitidos, adicione <code className="text-fg">localhost</code> e o domínio da loja.</li>
          <li>
            Coloque a chave em <code className="text-fg">.env.local</code> como <code className="text-fg">NEXT_PUBLIC_CS2INSPECT_KEY</code> e reinicie o servidor.
          </li>
        </ol>
        <a href={CS2INSPECT.docsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-[12.5px] font-semibold text-primary hover:text-primary-hover">
          Ver documentação oficial →
        </a>
      </Glass>
    </div>
  );
}
