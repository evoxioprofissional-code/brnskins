-- =============================================================================
-- Filtro por arma (ex.: só AK-47, só AWP) + contagem de itens por arma
-- As funções ganham o parâmetro p_weapons; as versões antigas são removidas.
-- =============================================================================

drop function if exists public.search_market_catalog(text[], text, text[], numeric, numeric, text[], boolean, boolean, boolean, text, integer, integer);
drop function if exists public.market_category_counts(text[], text[], numeric, numeric, text[], boolean, boolean, boolean);
drop function if exists public.market_skin_matches(public.market_skins, text[], text[], numeric, numeric, text[], boolean, boolean, boolean);

create index if not exists market_skins_weapon_idx on public.market_skins (weapon) where active;

create or replace function public.market_skin_matches(
  s public.market_skins,
  p_tokens text[],
  p_wears text[],
  p_min numeric,
  p_max numeric,
  p_rarities text[],
  p_star boolean,
  p_stattrak boolean,
  p_souvenir boolean,
  p_weapons text[]
) returns boolean
language sql
stable
set search_path = public
as $$
  select s.active
    and s.min_price_brl is not null
    and (p_weapons is null or s.weapon = any (p_weapons))
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
  p_weapons text[] default null,
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
    and public.market_skin_matches(s, p_tokens, p_wears, p_min, p_max, p_rarities, p_star, p_stattrak, p_souvenir, p_weapons)
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
  p_souvenir boolean default null,
  p_weapons text[] default null
) returns table (category_id text, n bigint)
language sql
stable
set search_path = public
as $$
  select s.category_id, count(*)
  from public.market_skins s
  where public.market_skin_matches(s, p_tokens, p_wears, p_min, p_max, p_rarities, p_star, p_stattrak, p_souvenir, p_weapons)
  group by s.category_id;
$$;

-- Armas disponíveis (na categoria escolhida ou em todas as de arma), com contagem
-- considerando os demais filtros — o filtro de arma em si não é aplicado aqui.
create or replace function public.market_weapon_counts(
  p_category text default null,
  p_tokens text[] default null,
  p_wears text[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_rarities text[] default null,
  p_star boolean default null,
  p_stattrak boolean default null,
  p_souvenir boolean default null
) returns table (weapon text, category_id text, n bigint)
language sql
stable
set search_path = public
as $$
  select s.weapon, s.category_id, count(*)
  from public.market_skins s
  where s.category_id in ('rifle', 'sniper', 'pistol', 'smg', 'heavy', 'knife', 'gloves', 'equipment')
    and (p_category is null or s.category_id = p_category)
    and public.market_skin_matches(s, p_tokens, p_wears, p_min, p_max, p_rarities, p_star, p_stattrak, p_souvenir, null)
  group by s.weapon, s.category_id;
$$;

grant execute on function public.market_skin_matches(public.market_skins, text[], text[], numeric, numeric, text[], boolean, boolean, boolean, text[]) to anon, authenticated, service_role;
grant execute on function public.search_market_catalog(text[], text, text[], numeric, numeric, text[], boolean, boolean, boolean, text[], text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.market_category_counts(text[], text[], numeric, numeric, text[], boolean, boolean, boolean, text[]) to anon, authenticated, service_role;
grant execute on function public.market_weapon_counts(text, text[], text[], numeric, numeric, text[], boolean, boolean, boolean) to anon, authenticated, service_role;
