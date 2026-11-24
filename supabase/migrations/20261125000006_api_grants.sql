-- =============================================================================
-- BRN Skins — privilégios da Data API
-- Este projeto não expõe tabelas novas automaticamente, então os acessos são
-- concedidos aqui de forma explícita (mínimo necessário). O RLS continua sendo
-- a barreira principal: os GRANTs só definem o que cada papel PODE tentar.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- service_role (somente servidor): acesso total
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- authenticated: operações nas tabelas; o RLS limita aos administradores
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon (visitantes): apenas leitura do catálogo público
grant select on
  public.categories,
  public.rarities,
  public.conditions,
  public.products,
  public.product_variants,
  public.prices,
  public.current_prices,
  public.kits,
  public.kit_items,
  public.settings,
  public.sub_store_plans
to anon;

-- Visões do painel: somente usuários autenticados (e o RLS das tabelas de origem)
revoke all on public.v_daily_sales, public.v_stock_summary, public.v_client_status from anon;
grant select on public.v_daily_sales, public.v_stock_summary, public.v_client_status to authenticated;

-- Funções expostas
grant execute on function public.is_admin(public.admin_role) to anon, authenticated;
grant execute on function public.create_order(text, text, text, jsonb) to anon, authenticated;

-- Tabelas criadas no futuro: service_role recebe acesso automaticamente;
-- anon/authenticated continuam explícitos em cada migration.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
