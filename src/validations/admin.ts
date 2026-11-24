import { z } from "zod";

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Informe a senha").max(200),
});

export const priceSchema = z.coerce.number().min(0, "Preço inválido").max(10_000_000);

export const whatsappSettingsSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{10,15}$/.test(v.replace(/\D/g, "")), "Use DDI + DDD + número"),
  greeting: z.string().trim().min(1, "Obrigatório").max(300),
  orderTemplateFooter: z.string().trim().max(300),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "Obrigatório").max(60),
  supportHours: z.string().trim().max(80),
  defaultDelivery: z.string().trim().max(20),
  showSteamComparison: z.boolean(),
});
