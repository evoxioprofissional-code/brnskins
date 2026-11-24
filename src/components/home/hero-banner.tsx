import Image from "next/image";
import { siteConfig } from "@/config/site";
import { PromoStrip } from "./promo-strip";

/**
 * Banner principal. A arte já contém todo o texto — nada é sobreposto.
 *
 * Enquadramento (desktop) calibrado com references/redesign-desktop.png:
 * a arte é posicionada em escala menor que a largura útil, e uma cópia
 * desfocada da própria arte preenche as bordas para manter a composição.
 */
export function HeroBanner() {
  const src = siteConfig.assets.heroBanner;
  return (
    <section aria-label="Destaque" className="relative">
      {/* Desktop */}
      <div className="relative hidden aspect-[1256/383] w-full overflow-hidden bg-[#070304] lg:block">
        <Image
          src={src}
          alt=""
          aria-hidden
          fill
          quality={40}
          sizes="60vw"
          className="scale-110 object-cover opacity-60 blur-[28px]"
        />
        <div
          className="absolute"
          style={{
            left: "3.806%",
            top: 0,
            width: "85.22%",
            aspectRatio: "2172 / 724",
            maskImage:
              "linear-gradient(90deg, transparent 0, #000 3%, #000 90%, transparent 100%), linear-gradient(180deg, #000 85%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0, #000 3%, #000 90%, transparent 100%)",
          }}
        >
          <Image
            src={src}
            alt="BRN Skins — compra, venda e upgrade de skins de CS2"
            fill
            priority
            sizes="(min-width: 1024px) 85vw, 100vw"
            className="object-cover"
          />
        </div>
        {/* vinheta inferior para assentar a faixa promocional */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-bg/60" />
        <div className="absolute bottom-0 left-[18px] right-[24px] h-[94px]">
          <PromoStrip />
        </div>
      </div>

      {/* Mobile / tablet: arte inteira (texto + personagem) em card arredondado */}
      <div className="px-3 pt-3 lg:hidden">
        <div className="relative aspect-[2172/724] w-full overflow-hidden rounded-[16px] border border-[#2a0a10] shadow-[0_10px_30px_-14px_rgb(230_0_35/0.55)]">
          <Image
            src={src}
            alt="BRN Skins — compra, venda e upgrade de skins de CS2"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="mt-2.5">
          <PromoStrip compact />
        </div>
      </div>
    </section>
  );
}
