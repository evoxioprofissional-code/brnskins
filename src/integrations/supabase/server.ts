import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a chave secreta — USO EXCLUSIVO NO SERVIDOR
 * (route handlers e server actions). Ignora o RLS, então toda rota que o usa
 * precisa validar quem está chamando (ex.: sessão do admin).
 * A variável SUPABASE_SERVICE_ROLE_KEY não tem prefixo NEXT_PUBLIC_, então
 * nunca é enviada ao navegador.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
