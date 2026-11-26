import { Box, KeyRound, LayoutGrid, Music, Shield, SprayCan, Sticker, UserRound, Zap, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/types/catalog";

type IconProps = { size?: number; className?: string };

/**
 * Silhuetas reais das armas, geradas a partir das artes oficiais das skins
 * (public/images/icons/*.png) e aplicadas como máscara — herdam `currentColor`.
 */
function silhouette(file: string, label: string) {
  return function WeaponSilhouette({ size = 16, className }: IconProps) {
    const url = `url(/images/icons/${file}.png)`;
    return (
      <span
        aria-hidden
        data-icon={label}
        className={["inline-block shrink-0 bg-current", className].filter(Boolean).join(" ")}
        style={{
          width: Math.round(size * 1.5),
          height: size,
          maskImage: url,
          WebkitMaskImage: url,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    );
  };
}

const lucide = (Icon: LucideIcon) =>
  function LucideCategoryIcon({ size = 16, className }: IconProps) {
    return (
      <span className={["inline-grid shrink-0 place-items-center", className].filter(Boolean).join(" ")} style={{ width: Math.round(size * 1.5), height: size }}>
        <Icon size={size} strokeWidth={1.9} aria-hidden />
      </span>
    );
  };

export const AllIcon = lucide(LayoutGrid);
export const AgentIcon = lucide(UserRound);
export const RifleIcon = silhouette("rifle", "rifle");
export const SniperIcon = silhouette("sniper", "sniper");
export const PistolIcon = silhouette("pistol", "pistol");
export const SmgIcon = silhouette("smg", "smg");
export const HeavyIcon = silhouette("heavy", "heavy");
export const KnifeIcon = silhouette("knife", "knife");
export const GlovesIcon = silhouette("gloves", "gloves");

export const CATEGORY_ICONS: Record<CategoryId | "all", (p: IconProps) => React.JSX.Element> = {
  all: AllIcon,
  rifle: RifleIcon,
  sniper: SniperIcon,
  pistol: PistolIcon,
  smg: SmgIcon,
  heavy: HeavyIcon,
  knife: KnifeIcon,
  gloves: GlovesIcon,
  agent: AgentIcon,
  equipment: lucide(Zap),
  sticker: lucide(Sticker),
  case: lucide(Box),
  graffiti: lucide(SprayCan),
  music: lucide(Music),
  patch: lucide(Shield),
  charm: lucide(KeyRound),
};

/** Selo do CS2 usado no seletor de jogo do header. */
export function Cs2Badge({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id="cs2g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb43a" />
          <stop offset="1" stopColor="#f08a12" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" rx="4" fill="url(#cs2g)" />
      <path
        d="M11.6 3.6c.9 0 1.5.7 1.4 1.5-.1.7-.7 1.2-1.4 1.2l-.2 1.3 2 .9-.4 1-1.8-.6-.6 1.7 1.3 3.1-1 .5-1.5-2.7-1.3 2.7H7l1.5-4 .3-2.6-1.6 1.2-.7-.8 2.8-2.3c.3-.6.9-1.1 1.7-1.1z"
        fill="#1b0f00"
        opacity=".85"
      />
    </svg>
  );
}
