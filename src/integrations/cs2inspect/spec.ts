import type { CharmSpec, InspectSpec, StickerSpec } from "./types";

export interface StickerSlot {
  index: number | null;
  x: number;
  y: number;
  rotation: number;
}

export const emptySticker = (): StickerSlot => ({ index: null, x: 0, y: 0, rotation: 0 });

/** Lista no formato do SDK: { slot, index, x?, y?, rotation? }. */
export function stickersSpec(slots: StickerSlot[]): StickerSpec[] {
  return slots.flatMap((s, slot) => {
    if (!s.index || s.index < 1) return [];
    const custom = s.x !== 0 || s.y !== 0 || s.rotation !== 0;
    return [custom ? { slot, index: s.index, x: s.x, y: s.y, rotation: Math.round(s.rotation) } : { slot, index: s.index }];
  });
}

export const charmSpec = (index: number | null, seed: number | null): CharmSpec | null =>
  index && index > 0 ? (seed && seed > 0 ? { index, seed } : { index }) : null;

export const hasPatches = (patches: (number | null)[]) => patches.some((p) => p && p > 0);

/** Remove campos vazios para não enviar parâmetros sem valor. */
export function compactSpec(spec: InspectSpec): InspectSpec {
  return Object.fromEntries(
    Object.entries(spec).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)),
  ) as InspectSpec;
}
