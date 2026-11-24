"use client";

import { Box, Briefcase, Eye, MessageCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { buildWhatsAppUrl } from "@/services/checkout/whatsapp";
import { effectiveWhatsApp, useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/components/ui/toaster";

export function useOpenWhatsApp() {
  const whatsapp = useSettingsStore((s) => s.whatsapp);
  return (message: string) => {
    const url = buildWhatsAppUrl(effectiveWhatsApp(whatsapp), message);
    if (!url) {
      toast("WhatsApp da loja ainda não configurado", "error");
      return false;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  };
}

function InfoPanel({
  icon,
  title,
  text,
  steps,
  cta,
  message,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  steps: string[];
  cta: string;
  message: string;
}) {
  const open = useOpenWhatsApp();
  return (
    <div className="panel p-6 lg:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-[radial-gradient(circle,rgb(230_0_35/0.35),rgb(230_0_35/0.08))] text-primary ring-1 ring-primary/30">
          {icon}
        </span>
        <div>
          <h2 className="text-[18px] font-bold">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-fg-2">{text}</p>
        </div>
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s} className="rounded-[10px] border border-border bg-surface-2 p-4">
            <span className="text-[12px] font-bold text-primary">PASSO {i + 1}</span>
            <p className="mt-1 text-[13.5px] text-fg">{s}</p>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => open(message)}
        className="btn-solid-red mt-6 inline-flex h-[40px] items-center gap-2 rounded-[8px] px-5 text-[14px] font-semibold"
      >
        <MessageCircle size={17} /> {cta}
      </button>
    </div>
  );
}

export function InventoryPanel() {
  return (
    <InfoPanel
      icon={<Briefcase size={22} />}
      title="Seu inventário"
      text="As skins compradas na BRN Skins aparecem aqui após a entrega. Enquanto a conexão com a Steam não está disponível, o acompanhamento é feito pelo WhatsApp."
      steps={["Finalize seu pedido pelo carrinho", "Receba a proposta de troca na Steam", "Aceite a troca e pronto"]}
      cta="Falar sobre meu inventário"
      message="Olá, BRN Skins! Quero ajuda com meu inventário."
    />
  );
}

export function UpgradesPanel() {
  return (
    <InfoPanel
      icon={<RefreshCw size={22} />}
      title="Upgrade de skins"
      text="Use suas skins atuais como parte do pagamento por uma skin melhor. Avaliamos seu item e abatemos o valor no pedido."
      steps={["Escolha a skin que você quer no catálogo", "Envie as skins que deseja dar como parte", "Receba a avaliação e pague só a diferença"]}
      cta="Solicitar avaliação de upgrade"
      message="Olá, BRN Skins! Quero fazer um upgrade usando minhas skins como parte do pagamento."
    />
  );
}

export function InspectPanel() {
  return (
    <div className="space-y-4">
      <a
        href="/inspect"
        className="panel flex items-center gap-4 border-primary/40 p-5 transition-colors hover:border-primary/70"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-primary/15 text-primary ring-1 ring-primary/30">
          <Box size={22} />
        </span>
        <span className="flex-1">
          <span className="block text-[16px] font-bold">BRN Inspect 3D</span>
          <span className="mt-0.5 block text-[13px] text-fg-2">
            Visualize qualquer skin em 3D: float, pattern, adesivos, amuletos, luvas, agentes e mapas.
          </span>
        </span>
        <span className="btn-solid-red hidden h-10 items-center rounded-[8px] px-4 text-[13.5px] font-semibold sm:inline-flex">Abrir</span>
      </a>
      <InfoPanel
      icon={<Eye size={22} />}
      title="Inspecionar skin em jogo"
      text="Quer ver a skin antes de comprar? Escolha o float e o padrão (pattern) desejados e enviamos o link de inspeção em jogo."
      steps={["Abra os detalhes de uma skin", "Escolha condição, float e pattern", "Receba o link de inspeção no WhatsApp"]}
      cta="Pedir inspeção"
      message="Olá, BRN Skins! Quero inspecionar uma skin em jogo antes de comprar."
    />
    </div>
  );
}
