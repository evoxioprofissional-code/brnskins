/**
 * Testa as operações do painel com um admin simulado e um usuário comum,
 * dentro de uma transação que é DESFEITA no final (nada fica gravado).
 * Uso: npm run db:test
 */
import { connect } from "./db.mjs";

const { client } = await connect({ verbose: false });
const q = (sql, params) => client.query(sql, params).then((r) => r.rows);
const ok = (cond, msg) => console.log(`${cond ? "✓" : "✗"} ${msg}`) || (cond ? 0 : (process.exitCode = 1));
const asUser = (id) => q(`select set_config('role', 'authenticated', true), set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: id, role: "authenticated" })]);
const asPostgres = () => q(`reset role`);

try {
  await q("begin");
  const [admin] = await q(`insert into auth.users (id, instance_id, aud, role, email) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-teste@brn.local') returning id`);
  const [user] = await q(`insert into auth.users (id, instance_id, aud, role, email) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-teste@brn.local') returning id`);
  await q(`insert into admin_users (user_id, role) values ($1, 'owner')`, [admin.id]);
  const [product] = await q(`insert into products (slug, weapon, finish, category_id, rarity_id, image_url) values ('teste-awp-fade', 'AWP', 'Fade', 'sniper', 'covert', '/images/skins/awp-fade.png') returning id`);
  const [cli] = await q(`insert into clients (name, handle, phone) values ('Cliente Teste', 'cliente_teste', '5511999999999') returning id`);

  // ---- como administrador
  await asUser(admin.id);
  ok((await q(`select public.is_admin() as a`))[0].a === true, "admin reconhecido por is_admin()");
  const [{ register_purchase: lot }] = await q(`select public.register_purchase($1, 'FN', 10, 2000, 2521.95)`, [product.id]);
  ok(Boolean(lot), "register_purchase criou o lote");
  await q(`select public.register_sale($1, 3, 2600, $2)`, [lot, cli.id]);
  const [l] = await q(`select quantity from stock_lots where id = $1`, [lot]);
  ok(l.quantity === 7, `venda baixou o estoque (10 → ${l.quantity})`);
  const movs = await q(`select type, amount, cost from movements order by created_at`);
  ok(movs.length === 2 && movs[1].type === "out" && Number(movs[1].cost) === 6000, "movimentações de entrada e saída (com custo) registradas");
  const [c] = await q(`select total_spent, orders_count, last_purchase_at from clients where id = $1`, [cli.id]);
  ok(Number(c.total_spent) === 7800 && c.orders_count === 1 && c.last_purchase_at, "cliente atualizado (total gasto, pedidos, última compra)");
  const [day] = await q(`select revenue, profit from v_daily_sales`);
  ok(Number(day.revenue) === 7800 && Number(day.profit) === 1800, `v_daily_sales: faturamento ${day.revenue}, lucro ${day.profit}`);
  const [sub] = await q(`insert into sub_stores (name, slug, owner_name, owner_phone, plan_id) values ('Loja Teste', 'loja-teste', 'Fulano', '5511988887777', 'pro') returning id, status`);
  await q(`select public.confirm_sub_store_payment($1, 'pagamento-teste')`, [sub.id]);
  const [s2] = await q(`select status, activated_at from sub_stores where id = $1`, [sub.id]);
  ok(s2.status === "active" && s2.activated_at, "sub-loja liberada após confirmar pagamento");
  let failed = false;
  try { await q("savepoint sp1"); await q(`select public.register_sale($1, 99, 1)`, [lot]); } catch { failed = true; await q("rollback to savepoint sp1"); }
  ok(failed, "venda acima do estoque é recusada");
  await asPostgres();

  // ---- como usuário comum (não admin)
  await asUser(user.id);
  ok((await q(`select count(*)::int n from clients`))[0].n === 0, "usuário comum não vê clientes");
  ok((await q(`select count(*)::int n from stock_lots`))[0].n === 0, "usuário comum não vê estoque");
  let denied = false;
  try { await q("savepoint sp2"); await q(`select public.register_purchase($1, 'FN', 1, 1, 1)`, [product.id]); } catch { denied = true; await q("rollback to savepoint sp2"); }
  ok(denied, "usuário comum não consegue registrar compra");
  ok((await q(`select count(*)::int n from categories`))[0].n === 8, "usuário comum lê o catálogo público");
  await asPostgres();
} catch (err) {
  console.error("Erro no teste:", err.message);
  process.exitCode = 1;
} finally {
  await q("rollback").catch(() => {});
  console.log("Transação desfeita — nenhum dado de teste ficou no banco.");
  await client.end();
}
