import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, RefreshCw, Search, ShoppingCart, Truck, Wallet } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/layout/page-container";

export const metadata: Metadata = { title: "Como funciona" };

const STEPS = [
  { icon: Search, title: "Escolha sua skin", text: "Filtre por categoria, desgaste, raridade e preço no catálogo." },
  { icon: ShoppingCart, title: "Monte o carrinho", text: "Defina condição, versão e quantidade. Kits também entram no carrinho." },
  { icon: MessageCircle, title: "Finalize no WhatsApp", text: "O pedido chega pronto para o nosso atendimento confirmar valores." },
  { icon: Wallet, title: "Pagamento", text: "Combinamos a forma de pagamento diretamente com você." },
  { icon: Truck, title: "Entrega", text: "Enviamos a proposta de troca na Steam, normalmente em cerca de 1h." },
];

const SERVICES = [
  { icon: ShoppingCart, title: "Compro", text: "Compramos suas skins ou o inventário completo." },
  { icon: RefreshCw, title: "Upgrade", text: "Use suas skins como parte do pagamento por outra melhor." },
  { icon: Truck, title: "Encomendo", text: "Encomendamos skins direto da China para o seu inventário." },
];

export default function HowItWorksPage() {
  return (
    <PageContainer>
      <PageHeading eyebrow="Como funciona" title="Comprar na BRN Skins é simples" description="Do catálogo à sua conta Steam, com atendimento humano em cada etapa." />
      <ol className="grid gap-[15px] sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-[10px] bg-primary/10 text-primary ring-1 ring-primary/30">
                <s.icon size={19} />
              </span>
              <span className="text-[28px] font-black italic text-white/[0.06]">0{i + 1}</span>
            </div>
            <h2 className="mt-4 text-[15px] font-bold">{s.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{s.text}</p>
          </li>
        ))}
      </ol>

      <h2 className="mb-4 mt-10 text-[18px] font-bold">Serviços</h2>
      <div className="grid gap-[15px] md:grid-cols-3">
        {SERVICES.map((s) => (
          <div key={s.title} className="panel flex items-start gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-primary/10 text-primary ring-1 ring-primary/30">
              <s.icon size={19} />
            </span>
            <div>
              <h3 className="promo-title text-[18px]">{s.title.toUpperCase()}</h3>
              <p className="mt-1 text-[13px] text-fg-2">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[#5b0b17] bg-[radial-gradient(60%_140%_at_0%_100%,rgb(190_0_28/0.3),transparent_60%),#0b0708] p-6">
        <p className="text-[15px] font-semibold">Pronto para escolher sua próxima skin?</p>
        <Link href="/" className="btn-solid-red inline-flex h-10 items-center rounded-[8px] px-5 text-[14px] font-semibold">
          Ver catálogo
        </Link>
      </div>
    </PageContainer>
  );
}
