/**
 * Verifica o banco: tabelas, RLS, políticas e o que a chave pública (anon) consegue acessar.
 * Uso: npm run db:verify
 */
import { connect, loadEnv } from "./db.mjs";

const env = loadEnv();
const { client } = await connect({ verbose: false });
const tables = (await client.query(`
  select c.relname as table, c.relrowsecurity as rls,
         (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' order by c.relname`)).rows;
console.log("Tabelas (public):");
for (const t of tables) console.log(`  ${t.rls ? "🔒" : "⚠ SEM RLS"} ${t.table.padEnd(20)} ${t.policies} política(s)`);
const views = (await client.query(`select table_name from information_schema.views where table_schema = 'public' order by 1`)).rows.map((r) => r.table_name);
const fns = (await client.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1`)).rows.map((r) => r.proname);
const buckets = (await client.query(`select id, public from storage.buckets order by id`)).rows;
const counts = (await client.query(`select (select count(*) from categories) cat, (select count(*) from rarities) rar, (select count(*) from conditions) cond, (select count(*) from sub_store_plans) plans, (select count(*) from recovery_rules) rules, (select count(*) from settings) settings`)).rows[0];
console.log("Visões:", views.join(", "));
console.log("Funções:", fns.join(", "));
console.log("Buckets:", buckets.map((b) => `${b.id}${b.public ? " (público)" : ""}`).join(", "));
console.log("Dados de referência:", JSON.stringify(counts));
await client.end();

// ---- Acesso pela API pública (como um visitante do site)
const base = env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1";
const headers = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
const get = async (path) => {
  const r = await fetch(`${base}/${path}`, { headers });
  const body = await r.json().catch(() => null);
  return { status: r.status, rows: Array.isArray(body) ? body.length : null, body };
};
console.log("\nAcesso anônimo (chave publishable):");
for (const [path, expect] of [
  ["categories?select=id", "deve listar 8"],
  ["conditions?select=code", "deve listar 5"],
  ["settings?select=key", "só as 3 chaves públicas"],
  ["sub_store_plans?select=id", "deve listar 3"],
  ["orders?select=id", "deve vir vazio (RLS)"],
  ["clients?select=id", "deve vir vazio (RLS)"],
  ["stock_lots?select=id", "deve vir vazio (RLS)"],
  ["movements?select=id", "deve vir vazio (RLS)"],
  ["admin_users?select=user_id", "deve vir vazio (RLS)"],
]) {
  const r = await get(path);
  const keys = path.startsWith("settings") && Array.isArray(r.body) ? " → " + r.body.map((x) => x.key).join(", ") : "";
  console.log(`  ${path.split("?")[0].padEnd(16)} HTTP ${r.status}  linhas=${r.rows}${keys}   (${expect})`);
}
const rpc = await fetch(`${base}/rpc/register_sale`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ p_lot_id: "00000000-0000-0000-0000-000000000000", p_quantity: 1, p_unit_price: 1 }),
});
console.log(`  rpc register_sale  HTTP ${rpc.status}   (deve ser negado para visitante)`);
