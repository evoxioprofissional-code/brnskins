-- =============================================================================
-- BRN Skins — Catálogo de mercado (sincronizado automaticamente)
-- market_skins: todas as skins do CS2 (fonte: ByMykel/CSGO-API, aberta).
-- market_offers: uma linha por skin × condição × versão, com o preço em USD de
-- cada mercado (fonte: arquivos públicos do CSGO Trader) e o preço de venda em
-- BRL calculado pela regra da loja (settings.pricing).
-- Escrita somente pelo servidor (service_role). Leitura pública do catálogo.
-- =============================================================================

create table public.market_skins (
  id           text primary key,                       -- id do ByMykel (ex.: skin-525ac56c082c)
  market_name  text not null unique,                   -- "★ Karambit | Doppler"
  weapon       text not null,
  finish       text not null,
  is_star      boolean not null default false,
  category_id  text not null references public.categories (id),
  rarity_id    text not null references public.rarities (id),
  image_url    text not null,
  min_float    numeric(6,4),
  max_float    numeric(6,4),
  stattrak     boolean not null default false,
  souvenir     boolean not null default false,
  active       boolean not null default true,
  synced_at    timestamptz not null default now()
);
create index market_skins_category_idx on public.market_skins (category_id) where active;

create table public.market_offers (
  skin_id           text not null references public.market_skins (id) on delete cascade,
  wear              public.wear_code not null,
  variant           public.variant_type not null default 'normal',
  market_hash_name  text not null,
  usd               jsonb not null default '{}'::jsonb,  -- {"buff163": 21.5, "c5game": 22.08, "steam": 25.53, ...}
  base_source       text,                                -- mercado usado no preço de venda
  price_brl         numeric(12,2) check (price_brl is null or price_brl >= 0),
  steam_brl         numeric(12,2) check (steam_brl is null or steam_brl >= 0),
  synced_at         timestamptz not null default now(),
  primary key (skin_id, wear, variant)
);
create index market_offers_priced_idx on public.market_offers (skin_id) where price_brl is not null;

alter table public.market_skins  enable row level security;
alter table public.market_offers enable row level security;

create policy market_skins_public_read on public.market_skins for select using (active);
create policy market_offers_public_read on public.market_offers for select using (true);
create policy market_skins_admin_all on public.market_skins
  for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));
create policy market_offers_admin_all on public.market_offers
  for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));

grant select on public.market_skins, public.market_offers to anon, authenticated;
grant insert, update, delete on public.market_skins, public.market_offers to authenticated;
grant all on public.market_skins, public.market_offers to service_role;

-- Regra de preço (lida pelo servidor). usd_brl é atualizado a cada sincronização.
insert into public.settings (key, value, is_public) values
  ('pricing', '{"source": "buff163", "margin_pct": 8, "usd_brl": 5.5}'::jsonb, false),
  ('catalog_sync', '{}'::jsonb, false)
on conflict (key) do nothing;

-- Primeiro mercado com preço, começando pelo preferido.
create or replace function public.pick_market_price(p_usd jsonb, p_preferred text)
returns table (src text, usd numeric)
language sql
immutable
set search_path = public
as $$
  select s, (p_usd ->> s)::numeric
  from unnest(array[p_preferred, 'buff163', 'c5game', 'csfloat', 'skinport', 'steam']) with ordinality as t(s, ord)
  where (p_usd ->> s) is not null and (p_usd ->> s)::numeric > 0
  order by ord
  limit 1;
$$;

-- Recalcula o preço de venda de todas as ofertas com a regra atual.
create or replace function public.reprice_market_offers()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  cfg jsonb;
  v_source text;
  v_margin numeric;
  v_rate numeric;
  n integer;
begin
  select value into cfg from public.settings where key = 'pricing';
  v_source := coalesce(cfg ->> 'source', 'buff163');
  v_margin := coalesce((cfg ->> 'margin_pct')::numeric, 0);
  v_rate   := coalesce((cfg ->> 'usd_brl')::numeric, 5.5);

  update public.market_offers o
  set (base_source, price_brl) = (
        select p.src, round(p.usd * v_rate * (1 + v_margin / 100), 2)
        from public.pick_market_price(o.usd, v_source) p
      ),
      steam_brl = round(nullif((o.usd ->> 'steam')::numeric, 0) * v_rate, 2);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.reprice_market_offers() from public, anon, authenticated;
grant execute on function public.reprice_market_offers() to service_role;
grant execute on function public.pick_market_price(jsonb, text) to anon, authenticated, service_role;
