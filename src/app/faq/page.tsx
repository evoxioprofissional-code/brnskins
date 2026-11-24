import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/layout/page-container";

export const metadata: Metadata = { title: "FAQ" };

const FAQ = [
  {
    q: "Como recebo minha skin?",
    a: "Após a confirmação do pagamento, enviamos uma proposta de troca na Steam para o seu trade link. O prazo estimado aparece nos detalhes de cada skin.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Ao finalizar o carrinho, o pedido é enviado ao nosso WhatsApp e combinamos a forma de pagamento diretamente com você.",
  },
  {
    q: "O que é o upgrade?",
    a: "Você usa skins que já tem como parte do pagamento de outra skin. Avaliamos seus itens e abatemos o valor do pedido.",
  },
  {
    q: "Posso inspecionar a skin antes de comprar?",
    a: "Sim. No painel de detalhes, use “Quer inspecionar esta skin em jogo?” para pedir o link de inspeção com o float e o pattern desejados.",
  },
  {
    q: "O que significam FN, MW, FT, WW e BS?",
    a: "São as condições de desgaste: Factory New, Minimal Wear, Field-Tested, Well-Worn e Battle-Scarred, definidas pelo float da skin.",
  },
  {
    q: "Vocês compram meu inventário?",
    a: "Sim. Compramos skins avulsas ou o inventário completo. Fale conosco pelo WhatsApp para uma avaliação.",
  },
  {
    q: "Os preços do site são definitivos?",
    a: "Nesta versão o catálogo usa dados demonstrativos. Os valores finais são sempre confirmados pelo atendimento antes do pagamento.",
  },
];

export default function FaqPage() {
  return (
    <PageContainer>
      <PageHeading eyebrow="FAQ" title="Perguntas frequentes" description="Tudo o que você precisa saber antes de comprar, vender ou fazer upgrade." />
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        {FAQ.map((item) => (
          <details key={item.q} className="panel group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-semibold">
              {item.q}
              <ChevronDown size={18} className="shrink-0 text-fg-2 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-2">{item.a}</p>
          </details>
        ))}
      </div>
    </PageContainer>
  );
}
