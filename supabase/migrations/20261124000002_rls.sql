-- =============================================================================
-- BRN Skins — Row Level Security
-- Regra geral:
--   * catálogo (ativo) e configurações públicas: leitura anônima
--   * qualquer escrita: apenas administradores (admin_users)
--   * pedidos: criação via função SECURITY DEFINER validada; leitura só admin
-- A service role key NUNCA deve ser usada no frontend.
-- =============================================================================

-- Helper: usuário atual é admin?
create or replace function public.is_admin(min_role public.admin_role default 'editor')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
      and case min_role
            when 'editor' then true
            when 'admin'  then au.role in ('admin', 'owner')
            when 'owner'  then au.role = 'owner'
          end
  );
$$;
revoke all on function public.is_admin(public.admin_role) from public;
grant execute on function public.is_admin(public.admin_role) to anon, authenticated;

alter table public.admin_users      enable row level security;
alter table public.categories       enable row level security;
alter table public.rarities         enable row level security;
alter table public.conditions       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.prices           enable row level security;
alter table public.kits             enable row level security;
alter table public.kit_items        enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.settings         enable row level security;

-- admin_users: cada admin vê o próprio registro; owners gerenciam todos
create policy admin_users_self_read on public.admin_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin('owner'));
create policy admin_users_owner_write on public.admin_users
  for all to authenticated using (public.is_admin('owner')) with check (public.is_admin('owner'));

-- Catálogo: leitura pública do que está ativo; admins leem tudo e escrevem
create policy categories_public_read on public.categories for select using (active or public.is_admin());
create policy categories_admin_write on public.categories for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));

create policy rarities_public_read on public.rarities for select using (true);
create policy rarities_admin_write on public.rarities for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));

create policy conditions_public_read on public.conditions for select using (true);
create policy conditions_admin_write on public.conditions for all to authenticated using (public.is_admin('owner')) with check (public.is_admin('owner'));

create policy products_public_read on public.products for select using (active or public.is_admin());
create policy products_admin_write on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy variants_public_read on public.product_variants for select using (
  available and exists (select 1 from public.products p where p.id = product_id and p.active)
  or public.is_admin()
);
create policy variants_admin_write on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy prices_public_read on public.prices for select using (true);
create policy prices_admin_write on public.prices for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy kits_public_read on public.kits for select using (active or public.is_admin());
create policy kits_admin_write on public.kits for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy kit_items_public_read on public.kit_items for select using (
  exists (select 1 from public.kits k where k.id = kit_id and k.active) or public.is_admin()
);
create policy kit_items_admin_write on public.kit_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: somente admins leem/alteram. Inserção pública apenas via create_order().
create policy orders_admin_all on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin_all on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Configurações: anônimos leem apenas chaves públicas (ex.: whatsapp_phone)
create policy settings_public_read on public.settings for select using (is_public or public.is_admin());
create policy settings_admin_write on public.settings for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));

-- -----------------------------------------------------------------------------
-- create_order: recalcula preços no servidor (o cliente nunca define valores)
-- items: [{ "variant_id": uuid, "quantity": int } | { "kit_id": uuid, "quantity": int }]
-- -----------------------------------------------------------------------------
create or replace function public.create_order(
  p_customer_name text,
  p_trade_link text,
  p_notes text,
  p_items jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text := 'BRN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_item jsonb;
  v_qty int;
  v_name text;
  v_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid items';
  end if;

  insert into orders (code, customer_name, trade_link, notes, subtotal, total)
  values (v_code, p_customer_name, nullif(p_trade_link, ''), nullif(p_notes, ''), 0, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := least(greatest(coalesce((v_item->>'quantity')::int, 1), 1), 99);
    if v_item ? 'variant_id' then
      select p.weapon || ' | ' || p.finish, cp.price into v_name, v_price
      from product_variants pv
      join products p on p.id = pv.product_id and p.active
      join current_prices cp on cp.variant_id = pv.id
      where pv.id = (v_item->>'variant_id')::uuid and pv.available;
      if v_price is null then raise exception 'variant unavailable'; end if;
      insert into order_items (order_id, variant_id, name, unit_price, quantity)
      values (v_order_id, (v_item->>'variant_id')::uuid, v_name, v_price, v_qty);
    elsif v_item ? 'kit_id' then
      select k.name, k.price into v_name, v_price from kits k where k.id = (v_item->>'kit_id')::uuid and k.active;
      if v_price is null then raise exception 'kit unavailable'; end if;
      insert into order_items (order_id, kit_id, name, unit_price, quantity)
      values (v_order_id, (v_item->>'kit_id')::uuid, v_name, v_price, v_qty);
    else
      raise exception 'invalid item';
    end if;
    v_subtotal := v_subtotal + v_price * v_qty;
    v_price := null;
  end loop;

  update orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return v_code;
end $$;

revoke all on function public.create_order(text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, jsonb) to anon, authenticated;
