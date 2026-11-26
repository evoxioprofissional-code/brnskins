-- =============================================================================
-- Preço da loja em yuan × cotação (modelo dos revendedores)
-- settings.pricing.mode:
--   'usd' → preço do mercado base (US$) × dólar × (1 + margem)        [antigo]
--   'cny' → preço do mercado base em ¥ × cotação (R$ por ¥) do revendedor
-- O preço em ¥ é reconstruído a partir do dólar com a cotação do dia da fonte
-- (settings.pricing.usd_cny), gravada a cada sincronização.
-- =============================================================================

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
  v_mode text;
  v_usd_cny numeric;
  v_cny_rate numeric;
  n integer;
begin
  select value into cfg from public.settings where key = 'pricing';
  v_source   := coalesce(cfg ->> 'source', 'buff163');
  v_margin   := coalesce((cfg ->> 'margin_pct')::numeric, 0);
  v_rate     := coalesce((cfg ->> 'usd_brl')::numeric, 5.5);
  v_mode     := coalesce(cfg ->> 'mode', 'usd');
  v_usd_cny  := nullif((cfg ->> 'usd_cny')::numeric, 0);
  v_cny_rate := nullif((cfg ->> 'cny_rate')::numeric, 0);
  if v_mode = 'cny' and (v_usd_cny is null or v_cny_rate is null) then
    v_mode := 'usd'; -- sem cotação do yuan ainda: mantém o cálculo em dólar
  end if;

  with calc as (
    select o.skin_id, o.wear, o.variant,
           p.src as new_source,
           case when v_mode = 'cny'
                then round(p.usd * v_usd_cny * v_cny_rate, 2)
                else round(p.usd * v_rate * (1 + v_margin / 100), 2) end as new_price,
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

revoke all on function public.reprice_market_offers() from public, anon, authenticated;
grant execute on function public.reprice_market_offers() to service_role;

notify pgrst, 'reload schema';
