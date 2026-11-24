/**
 * Tipos do SDK oficial embed.js do CS2Inspect (https://cs2inspect.skin/docs/api).
 * Conferidos com a documentação e com o código do próprio embed.js.
 */

export type InspectViewMode = "item" | "hands" | "agent";

export type InspectScene =
  | "vanity"
  | "dust2"
  | "mirage"
  | "inferno"
  | "nuke"
  | "overpass"
  | "ancient_day"
  | "ancient_night"
  | "anubis"
  | "baggage"
  | "cache"
  | "italy"
  | "office"
  | "train"
  | "vertigo";

export type AgentLoopAnim = "idle" | "lookat" | "walk" | "run" | "crouch" | "crouchWalk";
export type AgentOneShot = "draw" | "reload" | "fire" | "alt";

export type DopplerPhase = "1" | "2" | "3" | "4" | "ruby" | "sapphire" | "black-pearl" | "emerald";

export interface StickerSpec {
  slot: number;
  index: number;
  x?: number;
  y?: number;
  rotation?: number;
}

export interface CharmSpec {
  index: number;
  seed?: number;
}

/** Spec aceita por embed() e update(): parâmetros da URL + formas empacotadas pelo SDK. */
export interface InspectSpec {
  key?: string;
  item?: string;
  name?: string;
  phase?: DopplerPhase;
  wear?: number;
  seed?: number;
  /** O SDK converte para o parâmetro `st` */
  stattrak?: boolean;
  nametag?: string;
  stickers?: StickerSpec[];
  /** objeto, ou "none" para remover */
  charm?: CharmSpec | "none";
  bg?: string;
  spin?: number;
  card?: boolean;
  interactive?: boolean;
  view?: InspectViewMode;
  agent?: string;
  /** até 3 slots; null = slot vazio */
  patches?: (number | null)[];
  anim?: AgentLoopAnim;
  gloves?: string;
  glovewear?: number;
  scene?: InspectScene | "none";
  controls?: 0 | 1;
  ui?: 0 | 1;
  accent?: string;
  loader?: "bar" | "spinner" | "dots" | "none";
  logo?: "full" | "icon" | "minimal";
  logopos?: "bl" | "br" | "tl" | "tr";
}

export type InspectErrorReason =
  | "no_key"
  | "bad_key"
  | "revoked"
  | "origin_not_allowed"
  | "no_origin"
  | "unknown_item"
  | "no_model"
  | "rate_limited";

export interface InspectReadyEvent {
  item?: unknown;
}

export interface InspectErrorEvent {
  reason?: InspectErrorReason | string;
  message?: string;
}

export interface CS2InspectView {
  iframe: HTMLIFrameElement;
  destroy(): void;
  on(event: "ready", fn: (e: InspectReadyEvent) => void): void;
  on(event: "error", fn: (e: InspectErrorEvent) => void): void;
  on(event: string, fn: (e: unknown) => void): void;
  update(spec: InspectSpec): void;
  resetView(): void;
  setView(view: InspectViewMode): void;
  setScene(scene: InspectScene | "none"): void;
  setAccent(accent: string): void;
  /** Primeira pessoa */
  inspect(): void;
  /** Primeira pessoa; alt = ataque secundário */
  fire(alt?: boolean): void;
  /** Primeira pessoa */
  reload(): void;
  setUi(visible?: boolean): void;
  setAgent(model: string, patches?: (number | null)[]): void;
  setPatches(patches: (number | null)[]): void;
  /** Somente no modo agente */
  play(anim: AgentLoopAnim | AgentOneShot): void;
  /** "none" remove as luvas */
  setGloves(gloves: string, wear?: number): void;
}

export interface CS2InspectGlobal {
  embed(selector: string | HTMLElement, options: InspectSpec): CS2InspectView;
  url(spec: InspectSpec): string;
  origin: string;
}

declare global {
  interface Window {
    CS2Inspect?: CS2InspectGlobal;
  }
}
