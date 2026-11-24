import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

const SERVICES = [
  { title: "COMPRO", lines: ["compre suas skins ou", "inventário completo!"] },
  { title: "UPGRADE", lines: ["use suas skins como", "parte do pagamento!"] },
  { title: "ENCOMENDO", lines: ["encomendo suas skins", "direto da china pro seu", "inventário!"] },
];

const surface =
  "relative overflow-hidden rounded-[14px] border border-[#5b0b17] " +
  "bg-[radial-gradient(60%_140%_at_8%_100%,rgb(190_0_28/0.38),transparent_60%),radial-gradient(40%_120%_at_86%_70%,rgb(190_0_28/0.26),transparent_65%),linear-gradient(180deg,#0e0709_0%,#080506_100%)] " +
  "shadow-[0_0_26px_-8px_rgb(230_0_35/0.55),inset_0_-1px_0_rgb(255_40_70/0.45),inset_0_1px_0_rgb(255_255_255/0.03)]";

/**
 * Faixa promocional montada a partir dos elementos recortados de
 * /images/promo-banner.png (karambit, logotipo e butterfly), sem deformar a arte.
 */
export function PromoStrip({ compact = false }: { compact?: boolean }) {
  const { promo } = siteConfig.assets;

  if (compact) {
    return (
      <div className={cn(surface, "rounded-[14px] px-1 py-2.5")}>
        <div className="grid grid-cols-3 divide-x divide-[#3d0910]">
          {SERVICES.map((s) => (
            <div key={s.title} className="px-1.5 text-center">
              <p className="promo-title text-[13px] leading-none sm:text-[17px]">{s.title}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-[1.25] text-white/80 sm:text-[11.5px]">
                {s.lines.join(" ").replace(" pro seu inventário!", "!")}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(surface, "h-full w-full")}>
      {/* Karambit (cortada pela borda inferior, como na referência) */}
      <Image
        src={promo.karambit}
        alt=""
        aria-hidden
        width={1220}
        height={700}
        className="pointer-events-none absolute left-[4.20%] top-[5px] h-auto w-[190px] max-w-none drop-shadow-[0_0_14px_rgb(230_0_35/0.35)]"
      />
      <Image
        src={promo.logo}
        alt="BRN Skins"
        width={546}
        height={295}
        className="absolute left-[21.10%] top-[10px] h-[68px] w-auto"
      />

      {/* Serviços */}
      <div className="absolute left-[33.61%] top-[18px] h-[59px] w-px bg-gradient-to-b from-transparent via-[#c0001f] to-transparent" />
      <div className="absolute left-[47.86%] top-[18px] h-[59px] w-px bg-gradient-to-b from-transparent via-[#c0001f] to-transparent" />
      <div className="absolute left-[62.44%] top-[18px] h-[59px] w-px bg-gradient-to-b from-transparent via-[#c0001f] to-transparent" />
      {SERVICES.map((s, i) => (
        <div
          key={s.title}
          className="absolute top-[19px] -translate-x-1/2 text-center"
          style={{ left: `${[40.77, 55.11, 70.43][i]}%` }}
        >
          <p className="promo-title text-[18.5px] leading-[21px] tracking-[-0.015em]">{s.title}</p>
          <p className="mt-[3px] whitespace-nowrap text-[11px] font-normal leading-[13.5px] text-white/90 [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]">
            {s.lines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
        </div>
      ))}

      <Image
        src={promo.butterfly}
        alt=""
        aria-hidden
        width={1224}
        height={260}
        className="pointer-events-none absolute left-[78.09%] top-[22px] h-auto w-[236px] max-w-none -rotate-[9deg] drop-shadow-[0_0_14px_rgb(230_0_35/0.3)]"
      />
    </div>
  );
}
