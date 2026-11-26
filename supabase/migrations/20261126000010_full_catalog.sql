-- =============================================================================
-- BRN Skins — Catálogo completo (todos os tipos de item) + busca paginada
-- =============================================================================

-- Novas categorias (itens que não são armas)
insert into public.categories (id, label, badge, sort_order) values
  ('sticker',  'Adesivos',       'ADESIVO',  9),
  ('case',     'Caixas',         'CAIXA',    10),
  ('graffiti', 'Grafites',       'GRAFITE',  11),
  ('music',    'Kits de música', 'MÚSICA',   12),
  ('patch',    'Patches',        'PATCH',    13),
  ('charm',    'Chaveiros',      'CHAVEIRO', 14)
on conflict (id) do nothing;

-- Itens sem condição de desgaste (adesivos, caixas, agentes, facas vanilla...) usam '-'
alter table public.market_offers drop constraint market_offers_pkey;
alter table public.market_offers alter column wear type text using wear::text;
alter table public.market_offers add constraint market_offers_wear_check check (wear in ('FN', 'MW', 'FT', 'WW', 'BS', '-'));
alter table public.market_offers add primary key (skin_id, wear, variant);

-- Colunas de listagem (preenchidas por refresh_market_listing)
alter table public.market_skins
  add column has_wear       boolean not null default true,
  add column min_price_brl  numeric(12,2),
  add column wears          text[] not null default '{}',
  add column variants       text[] not null default '{}',
  add column discount_pct   integer not null default 0,
  add column featured_rank  integer;

create index market_skins_listing_idx on public.market_skins (featured_rank) where active and min_price_brl is not null;
create index market_skins_price_idx on public.market_skins (min_price_brl) where active;

-- Resumo por item a partir das ofertas + ranking de destaques
create or replace function public.refresh_market_listing()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare n integer;
begin
  update public.market_skins s
  set min_price_brl = a.min_price,
      wears = a.wears,
      variants = a.variants,
      discount_pct = a.discount
  from (
    select o.skin_id,
           min(o.price_brl) as min_price,
           array_agg(distinct o.wear) filter (where o.wear <> '-') as wears,
           array_agg(distinct o.variant::text) as variants,
           coalesce(max(case when o.variant = 'normal' and o.steam_brl > o.price_brl
                             then round((1 - o.price_brl / o.steam_brl) * 100) end), 0)::int as discount
    from public.market_offers o
    where o.price_brl is not null
    group by o.skin_id
  ) a
  where a.skin_id = s.id;

  update public.market_skins s
  set featured_rank = r.rk
  from (
    select id, row_number() over (order by min_price_brl desc nulls last, id) as rk
    from public.market_skins
    where active
  ) r
  where r.id = s.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Recalcular preço passa a atualizar também a listagem
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
      steam_brl = round(nullif((o.usd ->> 'steam')::numeric, 0) * v_rate, 2)
  where o.skin_id is not null;
  get diagnostics n = row_count;
  perform public.refresh_market_listing();
  return n;
end;
$$;

-- Filtro comum da busca (usado pela listagem e pela contagem por categoria)
create or replace function public.market_skin_matches(
  s public.market_skins,
  p_tokens text[],
  p_wears text[],
  p_min numeric,
  p_max numeric,
  p_rarities text[],
  p_star boolean,
  p_stattrak boolean,
  p_souvenir boolean
) returns boolean
language sql
stable
set search_path = public
as $$
  select s.active
    and s.min_price_brl is not null
    and (p_tokens is null or not exists (select 1 from unnest(p_tokens) t where s.market_name not ilike '%' || t || '%'))
    and (p_rarities is null or s.rarity_id = any (p_rarities))
    and (p_star is null or s.is_star = p_star)
    and (p_stattrak is null or ('stattrak' = any (s.variants)) = p_stattrak)
    and (p_souvenir is null or ('souvenir' = any (s.variants)) = p_souvenir)
    and (
      (p_wears is null and p_min is null and p_max is null)
      or exists (
        select 1 from public.market_offers o
        where o.skin_id = s.id
          and o.price_brl is not null
          and (p_wears is null or o.wear = any (p_wears))
          and (p_min is null or o.price_brl >= p_min)
          and (p_max is null or o.price_brl <= p_max)
      )
    );
$$;

create or replace function public.search_market_catalog(
  p_tokens text[] default null,
  p_category text default null,
  p_wears text[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_rarities text[] default null,
  p_star boolean default null,
  p_stattrak boolean default null,
  p_souvenir boolean default null,
  p_sort text default 'featured',
  p_limit integer default 48,
  p_offset integer default 0
) returns table (id text, total bigint)
language sql
stable
set search_path = public
as $$
  select s.id, count(*) over () as total
  from public.market_skins s
  where (p_category is null or s.category_id = p_category)
    and public.market_skin_matches(s, p_tokens, p_wears, p_min, p_max, p_rarities, p_star, p_stattrak, p_souvenir)
  order by
    case when p_sort = 'price-asc'  then s.min_price_brl end asc,
    case when p_sort = 'price-desc' then s.min_price_brl end desc,
    case when p_sort = 'discount'   then s.discount_pct end desc,
    case when p_sort = 'name'       then s.market_name end asc,
    s.featured_rank asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

create or replace function public.market_category_counts(
  p_tokens text[] default null,
  p_wears text[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_rarities text[] default null,
  p_star boolean default null,
  p_stattrak boolean default null,
  p_souvenir boolean default null
) returns table (category_id text, n bigint)
language sql
stable
set search_path = public
as $$
  select s.category_id, count(*)
  from public.market_skins s
  where public.market_skin_matches(s, p_tokens, p_wears, p_min, p_max, p_rarities, p_star, p_stattrak, p_souvenir)
  group by s.category_id;
$$;

create or replace function public.market_price_bounds()
returns table (min_price numeric, max_price numeric)
language sql
stable
set search_path = public
as $$
  select min(min_price_brl), max(min_price_brl) from public.market_skins where active and min_price_brl is not null;
$$;

revoke all on function public.refresh_market_listing() from public, anon, authenticated;
grant execute on function public.refresh_market_listing() to service_role;
revoke all on function public.reprice_market_offers() from public, anon, authenticated;
grant execute on function public.reprice_market_offers() to service_role;
grant execute on function public.market_skin_matches(public.market_skins, text[], text[], numeric, numeric, text[], boolean, boolean, boolean) to anon, authenticated, service_role;
grant execute on function public.search_market_catalog(text[], text, text[], numeric, numeric, text[], boolean, boolean, boolean, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.market_category_counts(text[], text[], numeric, numeric, text[], boolean, boolean, boolean) to anon, authenticated, service_role;
grant execute on function public.market_price_bounds() to anon, authenticated, service_role;
