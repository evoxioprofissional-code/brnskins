import { z } from "zod";

const TRADE_LINK = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Informe seu nome").max(80),
  tradeLink: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || TRADE_LINK.test(v), "Trade link inválido"),
  notes: z.string().trim().max(400),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
