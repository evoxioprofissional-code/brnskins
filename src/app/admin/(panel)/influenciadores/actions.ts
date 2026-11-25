"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { REFERRAL_CODE_RE } from "@/config/referral";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";

export type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/admin/influenciadores";
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const influencerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(80),
  code: z.string().trim().toLowerCase().regex(REFERRAL_CODE_RE, "Use letras minúsculas, números, - ou _ (2 a 30)"),
  commissionRate: z.number({ message: "Informe a comissão" }).min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  active: z.boolean(),
  contact: optional(120),
  pixKey: optional(140),
  notes: optional(400),
});

type Guard = { ok: false; error: string } | { ok: true; db: SupabaseClient };

async function guard(): Promise<Guard> {
  if (!(await isAdminRequest())) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Supabase não configurado no servidor." };
  return { ok: true, db };
}

export async function saveInfluencer(raw: z.input<typeof influencerSchema>): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return g;
  const parsed = influencerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { id, commissionRate, pixKey, ...rest } = parsed.data;
  const row = { ...rest, commission_rate: commissionRate, pix_key: pixKey };
  const { error } = id ? await g.db.from("influencers").update(row).eq("id", id) : await g.db.from("influencers").insert(row);
  if (error) return { ok: false, error: error.code === "23505" ? "Esse link já está em uso por outro influenciador." : "Não foi possível salvar." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function setInfluencerActive(id: string, active: boolean): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return g;
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Influenciador inválido" };
  const { error } = await g.db.from("influencers").update({ active }).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath(PATH);
  return { ok: true };
}

const statusSchema = z.enum(["pending", "approved", "paid", "canceled"]);

export async function setConversionStatus(id: string, status: z.infer<typeof statusSchema>): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return g;
  if (!z.string().uuid().safeParse(id).success || !statusSchema.safeParse(status).success) return { ok: false, error: "Dados inválidos" };
  const now = new Date().toISOString();
  const patch =
    status === "paid"
      ? { status, paid_at: now, decided_at: now }
      : status === "pending"
        ? { status, decided_at: null, paid_at: null }
        : { status, decided_at: now, paid_at: null };
  const { error } = await g.db.from("referral_conversions").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath(PATH);
  return { ok: true };
}

/** Marca como pagas todas as comissões aprovadas de um influenciador. */
export async function payApprovedCommissions(influencerId: string): Promise<ActionResult> {
  const g = await guard();
  if (!g.ok) return g;
  if (!z.string().uuid().safeParse(influencerId).success) return { ok: false, error: "Influenciador inválido" };
  const now = new Date().toISOString();
  const { error } = await g.db
    .from("referral_conversions")
    .update({ status: "paid", paid_at: now })
    .eq("influencer_id", influencerId)
    .eq("status", "approved");
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath(PATH);
  return { ok: true };
}
