/**
 * Sessão do painel administrativo — USO EXCLUSIVO NO SERVIDOR
 * (middleware e server actions). Nunca importar em componentes cliente.
 *
 * Token: `<expiraEm>.<hmac-sha256(expiraEm)>` assinado com ADMIN_SESSION_SECRET.
 * Quando o Supabase Auth for habilitado, substituir por sessão do Supabase +
 * verificação na tabela `admin_users`.
 */

export const ADMIN_COOKIE = "brn_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

/** Comparação em tempo constante. */
export function safeEqual(a: string, b: string) {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export function getAdminConfig() {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return { password, secret, enabled: password.length >= 8 && secret.length >= 32 };
}

export async function createSessionToken(secret: string) {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  return `${exp}.${await hmac(secret, String(exp))}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, await hmac(secret, exp));
}
