-- =============================================================================
-- BRN Skins — operação do painel administrativo
-- Estoque (lotes), movimentações, clientes, sub-lojas e recuperação de clientes.
-- Tudo restrito a administradores via RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.stock_status as enum ('selling', 'reserved', 'negotiating', 'other');
create type public.movement_type as enum ('in', 'out');
create type public.sub_store_status as enum ('pending', 'active', 'suspended');

-- Endurece a função de updated_at (aviso do Security Advisor)
alter function public.set_updated_at() set search_path = public;

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 80),
  handle            text unique check (handle is null or handle ~ '^[A-Za-z0-9_.-]{2,40}$'),
  phone             text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  trade_link        text,
  notes             text,
  total_spent       numeric(14,2) not null default 0 check (total_spent >= 0),
  orders_count      int not null default 0 check (orders_count >= 0),
  upgrades_count    int not null default 0 check (upgrades_count >= 0),
  last_purchase_at  timestamptz,
  last_contact_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index clients_last_purchase_idx on public.clients (last_purchase_at);
create index clients_total_spent_idx on public.clients (total_spent desc);

-- Pedidos podem ser vinculados a um cliente
alter table public.orders add column client_id uuid references public.clients (id) on delete set null;
create index orders_client_idx on public.orders (client_id);

-- -----------------------------------------------------------------------------
-- Estoque (lotes: unidades compradas pelo mesmo custo)
-- -----------------------------------------------------------------------------
create table public.stock_lots (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete restrict,
  wear          public.wear_code not null references public.conditions (code),
  variant       public.variant_type not null default 'normal',
  quantity      int not null check (quantity >= 0),
  unit_cost     numeric(12,2) not null check (unit_cost >= 0),
  market_price  numeric(12,2) not null check (market_price >= 0),
  status        public.stock_status not null default 'selling',
  source        text not null default 'manual',     -- 'manual' | id de fornecedor externo
  external_ref  text,                               -- id do item no fornecedor (futuro)
  acquired_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index stock_lots_product_idx on public.stock_lots (product_id);
create index stock_lots_status_idx on public.stock_lots (status) where quantity > 0;

-- -----------------------------------------------------------------------------
-- Movimentações (entradas = compras, saídas = vendas)
-- -----------------------------------------------------------------------------
create table public.movements (
  id            uuid primary key default gen_random_uuid(),
  type          public.movement_type not null,
  occurred_at   timestamptz not null default now(),
  product_id    uuid references public.products (id) on delete set null,
  stock_lot_id  uuid references public.stock_lots (id) on delete set null,
  client_id     uuid references public.clients (id) on delete set null,
  order_id      uuid references public.orders (id) on delete set null,
  description   text not null,
  quantity      int not null check (quantity > 0),
  amount        numeric(14,2) not null check (amount >= 0),
  cost          numeric(14,2) check (cost is null or cost >= 0),   -- custo das unidades vendidas
  created_by    uuid references auth.users (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  check (type = 'out' or cost is null)
);
create index movements_occurred_idx on public.movements (occurred_at desc);
create index movements_type_occurred_idx on public.movements (type, occurred_at desc);
create index movements_client_idx on public.movements (client_id);

-- -----------------------------------------------------------------------------
-- Sub-lojas (revendedores)
-- -----------------------------------------------------------------------------
create table public.sub_store_plans (
  id             text primary key,                  -- 'basic' | 'pro' | 'elite'
  label          text not null,
  monthly_price  numeric(10,2) not null check (monthly_price >= 0),
  active         boolean not null default true,
  sort_order     int not null default 0
);

create table public.sub_stores (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 60),
  slug               text not null unique check (slug ~ '^[a-z0-9-]{3,32}$'),
  owner_name         text not null,
  owner_phone        text not null check (owner_phone ~ '^[0-9]{10,15}$'),
  plan_id            text not null references public.sub_store_plans (id),
  status             public.sub_store_status not null default 'pending',
  payment_reference  text,                           -- id da cobrança no gateway (futuro)
  activated_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index sub_stores_status_idx on public.sub_stores (status);

-- -----------------------------------------------------------------------------
-- Recuperação de clientes
-- -----------------------------------------------------------------------------
create table public.recovery_rules (
  id          uuid primary key default gen_random_uuid(),
  days        int not null check (days between 1 and 365),
  label       text not null,
  message     text not null check (char_length(message) <= 500),
  enabled     boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.recovery_contacts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  rule_id       uuid references public.recovery_rules (id) on delete set null,
  channel       text not null default 'whatsapp',
  message       text not null,
  contacted_at  timestamptz not null default now(),
  created_by    uuid references auth.users (id) default auth.uid()
);
create index recovery_contacts_client_idx on public.recovery_contacts (client_id, contacted_at desc);

-- Mantém clients.last_contact_at atualizado
create or replace function public.touch_client_contact()
returns trigger language plpgsql set search_path = public as $$
begin
  update clients set last_contact_at = new.contacted_at where id = new.client_id;
  return new;
end $$;
create trigger recovery_contacts_touch after insert on public.recovery_contacts
  for each row execute function public.touch_client_contact();

-- Triggers updated_at
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger stock_lots_updated_at before update on public.stock_lots for each row execute function public.set_updated_at();
create trigger sub_stores_updated_at before update on public.sub_stores for each row execute function public.set_updated_at();
create trigger recovery_rules_updated_at before update on public.recovery_rules for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: tudo aqui é exclusivo de administradores
-- -----------------------------------------------------------------------------
alter table public.clients           enable row level security;
alter table public.stock_lots        enable row level security;
alter table public.movements         enable row level security;
alter table public.sub_store_plans   enable row level security;
alter table public.sub_stores        enable row level security;
alter table public.recovery_rules    enable row level security;
alter table public.recovery_contacts enable row level security;

create policy clients_admin_all on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy stock_lots_admin_all on public.stock_lots for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy movements_admin_all on public.movements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sub_stores_admin_all on public.sub_stores for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recovery_rules_admin_all on public.recovery_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recovery_contacts_admin_all on public.recovery_contacts for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- planos de sub-loja são públicos para leitura (página de venda de lojas)
create policy sub_store_plans_public_read on public.sub_store_plans for select using (active or public.is_admin());
create policy sub_store_plans_admin_write on public.sub_store_plans for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));

-- -----------------------------------------------------------------------------
-- Operações atômicas (security invoker: as políticas acima continuam valendo)
-- -----------------------------------------------------------------------------

-- Compra: cria o lote e a movimentação de entrada.
create or replace function public.register_purchase(
  p_product_id uuid,
  p_wear public.wear_code,
  p_quantity int,
  p_unit_cost numeric,
  p_market_price numeric,
  p_variant public.variant_type default 'normal'
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_lot uuid;
  v_name text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_quantity < 1 or p_unit_cost < 0 or p_market_price < 0 then raise exception 'invalid values'; end if;
  select weapon || ' | ' || finish into v_name from products where id = p_product_id;
  if v_name is null then raise exception 'product not found'; end if;

  insert into stock_lots (product_id, wear, variant, quantity, unit_cost, market_price)
  values (p_product_id, p_wear, p_variant, p_quantity, p_unit_cost, p_market_price)
  returning id into v_lot;

  insert into movements (type, product_id, stock_lot_id, description, quantity, amount)
  values ('in', p_product_id, v_lot, 'Compra · ' || v_name, p_quantity, round(p_unit_cost * p_quantity, 2));
  return v_lot;
end $$;

-- Venda: baixa o lote, registra a saída (com custo) e atualiza o cliente.
create or replace function public.register_sale(
  p_lot_id uuid,
  p_quantity int,
  p_unit_price numeric,
  p_client_id uuid default null,
  p_order_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_lot stock_lots%rowtype;
  v_name text;
  v_amount numeric(14,2);
  v_mov uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into v_lot from stock_lots where id = p_lot_id for update;
  if not found then raise exception 'lot not found'; end if;
  if p_quantity < 1 or p_quantity > v_lot.quantity then raise exception 'invalid quantity'; end if;
  if p_unit_price < 0 then raise exception 'invalid price'; end if;

  select weapon || ' | ' || finish into v_name from products where id = v_lot.product_id;
  v_amount := round(p_unit_price * p_quantity, 2);

  update stock_lots set quantity = quantity - p_quantity where id = p_lot_id;

  insert into movements (type, product_id, stock_lot_id, client_id, order_id, description, quantity, amount, cost)
  values ('out', v_lot.product_id, p_lot_id, p_client_id, p_order_id, 'Venda · ' || coalesce(v_name, 'Skin'),
          p_quantity, v_amount, round(v_lot.unit_cost * p_quantity, 2))
  returning id into v_mov;

  if p_client_id is not null then
    update clients
       set total_spent = total_spent + v_amount,
           orders_count = orders_count + 1,
           last_purchase_at = now()
     where id = p_client_id;
  end if;
  return v_mov;
end $$;

-- Liberação de sub-loja após o pagamento (chamada pelo admin hoje; pelo webhook do gateway no futuro).
create or replace function public.confirm_sub_store_payment(p_sub_store_id uuid, p_payment_reference text default null)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update sub_stores
     set status = 'active',
         activated_at = coalesce(activated_at, now()),
         payment_reference = coalesce(p_payment_reference, payment_reference)
   where id = p_sub_store_id and status <> 'active';
end $$;

revoke all on function public.register_purchase(uuid, public.wear_code, int, numeric, numeric, public.variant_type) from public, anon;
revoke all on function public.register_sale(uuid, int, numeric, uuid, uuid) from public, anon;
revoke all on function public.confirm_sub_store_payment(uuid, text) from public, anon;
grant execute on function public.register_purchase(uuid, public.wear_code, int, numeric, numeric, public.variant_type) to authenticated;
grant execute on function public.register_sale(uuid, int, numeric, uuid, uuid) to authenticated;
grant execute on function public.confirm_sub_store_payment(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Visões para o dashboard (security_invoker: respeitam o RLS de quem consulta)
-- -----------------------------------------------------------------------------
create or replace view public.v_daily_sales with (security_invoker = true) as
select
  (occurred_at at time zone 'America/Sao_Paulo')::date as day,
  sum(amount)                  as revenue,
  sum(amount - coalesce(cost, 0)) as profit,
  sum(quantity)                as units
from public.movements
where type = 'out'
group by 1;

create or replace view public.v_stock_summary with (security_invoker = true) as
select
  status,
  sum(quantity)                          as units,
  sum(quantity * unit_cost)              as cost_value,
  sum(quantity * market_price)           as market_value,
  sum(quantity * (market_price - unit_cost)) as variation
from public.stock_lots
where quantity > 0
group by status;

create or replace view public.v_client_status with (security_invoker = true) as
select
  c.*,
  case
    when c.last_purchase_at is null then 'inactive'
    when c.last_purchase_at >= now() - interval '30 days' then 'active'
    when c.last_purchase_at >= now() - interval '60 days' then 'risk'
    else 'inactive'
  end as status,
  extract(day from now() - c.last_purchase_at)::int as idle_days
from public.clients c;

-- -----------------------------------------------------------------------------
-- Dados iniciais (configuração, não demonstrativos)
-- -----------------------------------------------------------------------------
insert into public.sub_store_plans (id, label, monthly_price, sort_order) values
  ('basic', 'Básico', 297, 1),
  ('pro',   'Pro',    497, 2),
  ('elite', 'Elite',  997, 3)
on conflict (id) do nothing;

insert into public.recovery_rules (days, label, message, sort_order) values
  (7,  'Reativar após 7 dias sem compra',      'Fala, {nome}! Chegaram skins novas na BRN Skins e separei algumas que combinam com você. Quer dar uma olhada?', 1),
  (15, 'Promoção personalizada após 15 dias',  '{nome}, faz um tempinho! Liberei um desconto especial pra sua próxima skin ou upgrade. Bora?', 2),
  (30, 'Última tentativa após 30 dias',        '{nome}, sentimos sua falta na BRN Skins! Seu inventário merece um upgrade — me chama que eu te ajudo.', 3);

insert into public.settings (key, value, is_public) values
  ('recovery_enabled', 'true', false),
  ('monthly_goal',     '150000', false)
on conflict (key) do nothing;
