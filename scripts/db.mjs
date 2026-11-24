/**
 * Conexão administrativa com o Postgres do Supabase (somente para scripts locais).
 * Lê as credenciais do .env.local — nunca do código.
 *
 * Ordem de tentativa: SUPABASE_DB_URL (se definido) → host direto → pooler (modo sessão).
 */
import fs from "node:fs";
import pg from "pg";

export function loadEnv(file = ".env.local") {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const POOLER_REGIONS = [
  "sa-east-1", "us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-central-1", "eu-west-1",
  "eu-west-2", "eu-west-3", "eu-north-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
  "ap-northeast-2", "ap-south-1", "ca-central-1",
];

export function candidates(env) {
  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const password = env.SUPABASE_DB_PASSWORD;
  const base = { database: "postgres", password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 };
  const list = [];
  if (env.SUPABASE_DB_URL) list.push({ label: "SUPABASE_DB_URL", config: { connectionString: env.SUPABASE_DB_URL, ssl: base.ssl } });
  list.push({ label: "direto", config: { ...base, host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" } });
  for (const prefix of ["aws-1", "aws-0"])
    for (const region of POOLER_REGIONS)
      list.push({
        label: `pooler ${prefix}-${region}`,
        config: { ...base, host: `${prefix}-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
      });
  return list;
}

/** Abre a primeira conexão que funcionar. */
export async function connect({ verbose = true } = {}) {
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_DB_PASSWORD) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_DB_PASSWORD no .env.local");
  }
  const errors = [];
  for (const c of candidates(env)) {
    const client = new pg.Client(c.config);
    try {
      await client.connect();
      await client.query("select 1");
      if (verbose) console.log(`Conectado (${c.label}).`);
      return { client, label: c.label };
    } catch (err) {
      errors.push(`${c.label}: ${String(err.message).slice(0, 90)}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error("Não foi possível conectar:\n" + errors.slice(0, 6).join("\n"));
}
