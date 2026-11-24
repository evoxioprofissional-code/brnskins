"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
  getAdminConfig,
  safeEqual,
} from "@/lib/admin-session";
import { adminLoginSchema } from "@/validations/admin";

export interface LoginState {
  error?: string;
}

const safeNext = (value: FormDataEntryValue | null) => {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") && !v.startsWith("//") ? v : "/admin";
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const { password, secret, enabled } = getAdminConfig();
  if (!enabled) return { error: "Painel desativado: configure ADMIN_PASSWORD e ADMIN_SESSION_SECRET no .env.local." };

  const parsed = adminLoginSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Senha inválida" };

  // pequeno atraso fixo para dificultar força bruta
  await new Promise((r) => setTimeout(r, 400));
  if (!safeEqual(parsed.data.password, password)) return { error: "Senha incorreta" };

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
