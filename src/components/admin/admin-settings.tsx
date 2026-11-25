"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { useSettingsStore } from "@/stores/settings-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { storeSettingsSchema, whatsappSettingsSchema } from "@/validations/admin";
import { buildOrderMessage } from "@/services/checkout/whatsapp";
import { toast } from "@/components/ui/toaster";
import { AdminCard, AdminPageHeader, DemoNotice, Field, Toggle, inputClass } from "./admin-ui";

function SaveButton() {
  return (
    <button type="submit" className="h-9 rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover">
      Salvar alterações
    </button>
  );
}

export function AdminStoreSettings() {
  const hydrated = useHydrated();
  const store = useSettingsStore((s) => s.store);
  const update = useSettingsStore((s) => s.updateStore);
  const [form, setForm] = useState(store);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setForm(store), [store, hydrated]);

  return (
    <>
      <AdminPageHeader title="Configurações da loja" description="Informações gerais exibidas na loja." />
      <DemoNotice />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = storeSettingsSchema.safeParse(form);
          if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
            return;
          }
          setErrors({});
          update(parsed.data);
          toast("Configurações salvas");
        }}
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <AdminCard title="Loja">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da loja" error={errors.storeName}>
              <input className={inputClass} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
            </Field>
            <Field label="Horário de atendimento" error={errors.supportHours}>
              <input className={inputClass} value={form.supportHours} onChange={(e) => setForm({ ...form, supportHours: e.target.value })} />
            </Field>
            <Field label="Prazo de entrega padrão" hint="Ex.: ~1h" error={errors.defaultDelivery}>
              <input className={inputClass} value={form.defaultDelivery} onChange={(e) => setForm({ ...form, defaultDelivery: e.target.value })} />
            </Field>
            <Field label="Moeda">
              <input className={inputClass} value="BRL (R$)" disabled />
            </Field>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-[8px] bg-white/[0.02] px-3 py-3">
            <div>
              <p className="text-[13.5px] font-semibold">Comparação com a Steam</p>
              <p className="text-[12px] text-fg-2">Exibe “Preço no Steam” no painel de detalhes.</p>
            </div>
            <Toggle checked={form.showSteamComparison} onChange={(v) => setForm({ ...form, showSteamComparison: v })} label="Comparação com a Steam" />
          </div>
          <div className="mt-5">
            <SaveButton />
          </div>
        </AdminCard>
        <AdminCard title="Integrações">
          <ul className="space-y-3 text-[13px]">
            <li className="flex justify-between">
              <span className="text-fg-2">Fonte do catálogo</span>
              <span className="font-semibold">{siteConfig.catalogSource === "demo" ? "Demonstrativa" : "Supabase"}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-fg-2">Supabase</span>
              <span className="font-semibold text-amber-300/80">Não conectado</span>
            </li>
            <li className="flex justify-between">
              <span className="text-fg-2">Provedor de preços</span>
              <span className="font-semibold text-amber-300/80">Não configurado</span>
            </li>
          </ul>
          <p className="mt-4 text-[12px] leading-relaxed text-faint">
            As migrations do banco estão em <code>supabase/migrations</code>. Chaves privadas nunca são expostas ao frontend.
          </p>
        </AdminCard>
      </form>
    </>
  );
}

export function AdminWhatsApp() {
  const hydrated = useHydrated();
  const whatsapp = useSettingsStore((s) => s.whatsapp);
  const update = useSettingsStore((s) => s.updateWhatsApp);
  const [form, setForm] = useState(whatsapp);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setForm(whatsapp), [whatsapp, hydrated]);

  const preview = buildOrderMessage({
    greeting: form.greeting,
    footer: form.orderTemplateFooter,
    customerName: "Cliente Exemplo",
    items: [
      {
        kind: "skin",
        key: "preview",
        skinId: "preview",
        name: "AWP | Fade",
        image: "",
        wear: "FN",
        variant: "normal",
        unitPrice: 2521.95,
        quantity: 1,
      },
    ],
    total: 2521.95,
    orderId: "BRN_EXEMPLO",
  });

  return (
    <>
      <AdminPageHeader title="WhatsApp" description="Número e mensagens usados na finalização dos pedidos." />
      <DemoNotice>
        O número também pode ser definido pela variável <code>NEXT_PUBLIC_WHATSAPP_NUMBER</code>. O valor salvo aqui tem
        prioridade neste navegador.
      </DemoNotice>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = whatsappSettingsSchema.safeParse(form);
          if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
            return;
          }
          setErrors({});
          update({ ...parsed.data, phone: parsed.data.phone.replace(/\D/g, "") });
          toast("WhatsApp atualizado");
        }}
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"
      >
        <AdminCard title="Configuração">
          <div className="space-y-4">
            <Field label="Número (DDI + DDD + número)" hint="Ex.: 5511999999999" error={errors.phone}>
              <input className={inputClass} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Saudação do pedido" error={errors.greeting}>
              <textarea className={`${inputClass} h-20 resize-y py-2`} value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} />
            </Field>
            <Field label="Rodapé da mensagem" error={errors.orderTemplateFooter}>
              <textarea
                className={`${inputClass} h-20 resize-y py-2`}
                value={form.orderTemplateFooter}
                onChange={(e) => setForm({ ...form, orderTemplateFooter: e.target.value })}
              />
            </Field>
            <SaveButton />
          </div>
        </AdminCard>
        <AdminCard title="Pré-visualização">
          <pre className="whitespace-pre-wrap rounded-[10px] bg-[#0b2a17]/60 p-3 font-sans text-[12.5px] leading-relaxed text-fg">{preview}</pre>
        </AdminCard>
      </form>
    </>
  );
}

export function AdminBanners() {
  const hydrated = useHydrated();
  const banners = useSettingsStore((s) => s.banners);
  const update = useSettingsStore((s) => s.updateBanners);
  const { promo } = siteConfig.assets;
  return (
    <>
      <AdminPageHeader title="Banners" description="Artes exibidas no topo da loja." />
      <DemoNotice>
        Para trocar uma arte, substitua o arquivo correspondente em <code>public/images</code> mantendo o mesmo nome. Upload pelo
        painel será habilitado com o Storage do Supabase.
      </DemoNotice>
      <div className="space-y-4">
        <AdminCard title="Banner principal" actions={<code className="text-[11.5px] text-faint">/images/hero-banner.png · 2172×724</code>}>
          <div className="relative aspect-[3/1] overflow-hidden rounded-[10px] border border-border">
            <Image src={siteConfig.assets.heroBanner} alt="" fill sizes="900px" className="object-cover" />
          </div>
          <div className="mt-4 max-w-xl">
            <Field label="Texto alternativo (acessibilidade)">
              <input
                className={inputClass}
                value={hydrated ? banners.heroAlt : ""}
                onChange={(e) => update({ heroAlt: e.target.value })}
              />
            </Field>
          </div>
        </AdminCard>
        <AdminCard title="Faixa promocional" actions={<code className="text-[11.5px] text-faint">/images/promo-banner.png</code>}>
          <p className="mb-3 text-[12.5px] text-fg-2">Elementos recortados da arte original e usados na composição da faixa:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Karambit", promo.karambit],
              ["Logotipo", promo.logo],
              ["Butterfly", promo.butterfly],
            ].map(([label, src]) => (
              <div key={label} className="rounded-[10px] border border-border bg-surface-2 p-3">
                <div className="relative h-24">
                  <Image src={src!} alt={label!} fill sizes="300px" className="object-contain" />
                </div>
                <p className="mt-2 text-center text-[12px] text-fg-2">{label}</p>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
