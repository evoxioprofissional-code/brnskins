/**
 * Aplica as migrations de supabase/migrations em ordem, cada uma em uma
 * transação. As já aplicadas ficam registradas em brn_meta.migrations.
 *
 * Uso:  npm run db:migrate            (aplica as pendentes)
 *       npm run db:migrate -- --status (só lista)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db.mjs";

const DIR = path.resolve("supabase/migrations");
const statusOnly = process.argv.includes("--status");

const { client } = await connect();
try {
  await client.query(`
    create schema if not exists brn_meta;
    revoke all on schema brn_meta from public, anon, authenticated;
    create table if not exists brn_meta.migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
  `);
  const applied = new Map((await client.query("select name, checksum from brn_meta.migrations")).rows.map((r) => [r.name, r.checksum]));
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

  let pending = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(DIR, file), "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex").slice(0, 16);
    if (applied.has(file)) {
      const changed = applied.get(file) !== checksum;
      console.log(`${changed ? "⚠" : "✓"} ${file}${changed ? "  (alterada depois de aplicada — crie uma nova migration)" : ""}`);
      continue;
    }
    pending++;
    if (statusOnly) {
      console.log(`… ${file}  (pendente)`);
      continue;
    }
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into brn_meta.migrations (name, checksum) values ($1, $2)", [file, checksum]);
      await client.query("commit");
      console.log("aplicada");
    } catch (err) {
      await client.query("rollback");
      console.log("FALHOU");
      console.error(`\n${err.message}${err.position ? ` (posição ${err.position})` : ""}`);
      process.exitCode = 1;
      break;
    }
  }
  if (!pending) console.log("Nenhuma migration pendente.");
} finally {
  await client.end();
}
