-- Destaques: facas, luvas e armas primeiro; adesivos, caixas e afins depois
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
           coalesce(array_agg(distinct o.wear) filter (where o.wear <> '-'), '{}') as wears,
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
  ) r
  where r.id = s.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.refresh_market_listing() from public, anon, authenticated;
grant execute on function public.refresh_market_listing() to service_role;

select public.refresh_market_listing();
