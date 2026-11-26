-- =============================================================================
-- Recálculo de preços mais leve + tempo limite maior para o servidor
-- A API do Supabase limita cada chamada a 8 s. O recálculo de ~31 mil ofertas
-- passou disso na sincronização. Agora:
--  1) só grava linhas cujo valor mudou;
--  2) o papel service_role (usado SOMENTE no servidor) pode levar até 120 s.
-- =============================================================================

alter role service_role set statement_timeout = '120s';

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

  with calc as (
    select o.skin_id, o.wear, o.variant,
           p.src as new_source,
           round(p.usd * v_rate * (1 + v_margin / 100), 2) as new_price,
           round(nullif((o.usd ->> 'steam')::numeric, 0) * v_rate, 2) as new_steam
    from public.market_offers o
    left join lateral public.pick_market_price(o.usd, v_source) p on true
  )
  update public.market_offers o
  set base_source = c.new_source, price_brl = c.new_price, steam_brl = c.new_steam
  from calc c
  where o.skin_id = c.skin_id and o.wear = c.wear and o.variant = c.variant
    and (o.price_brl is distinct from c.new_price
      or o.steam_brl is distinct from c.new_steam
      or o.base_source is distinct from c.new_source);
  get diagnostics n = row_count;
  perform public.refresh_market_listing();
  return n;
end;
$$;

create or replace function public.refresh_market_listing()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare n integer;
begin
  with a as (
    select o.skin_id,
           min(o.price_brl) as min_price,
           coalesce(array_agg(distinct o.wear) filter (where o.wear <> '-'), '{}') as wears,
           array_agg(distinct o.variant::text) as variants,
           coalesce(max(case when o.variant = 'normal' and o.steam_brl > o.price_brl
                             then round((1 - o.price_brl / o.steam_brl) * 100) end), 0)::int as discount
    from public.market_offers o
    where o.price_brl is not null
    group by o.skin_id
  )
  update public.market_skins s
  set min_price_brl = a.min_price, wears = a.wears, variants = a.variants, discount_pct = a.discount
  from a
  where a.skin_id = s.id
    and (s.min_price_brl is distinct from a.min_price
      or s.wears is distinct from a.wears
      or s.variants is distinct from a.variants
      or s.discount_pct is distinct from a.discount);

  with r as (
    select id, row_number() over (
      order by
        case category_id
          when 'knife' then 1 when 'gloves' then 2 when 'rifle' then 3 when 'sniper' then 4
          when 'pistol' then 5 when 'smg' then 6 when 'heavy' then 7 when 'agent' then 8
          else 9 end,
        min_price_brl desc nulls last,
        id
    ) as rk
    from public.market_skins
    where active
  )
  update public.market_skins s
  set featured_rank = r.rk
  from r
  where r.id = s.id and s.featured_rank is distinct from r.rk;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.reprice_market_offers() from public, anon, authenticated;
grant execute on function public.reprice_market_offers() to service_role;
revoke all on function public.refresh_market_listing() from public, anon, authenticated;
grant execute on function public.refresh_market_listing() to service_role;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
