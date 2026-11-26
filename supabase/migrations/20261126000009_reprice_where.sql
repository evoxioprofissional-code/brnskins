-- O Supabase exige WHERE em UPDATE feito pela API (pg-safeupdate).
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
  return n;
end;
$$;

revoke all on function public.reprice_market_offers() from public, anon, authenticated;
grant execute on function public.reprice_market_offers() to service_role;
