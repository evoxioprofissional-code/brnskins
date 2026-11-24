-- =============================================================================
-- BRN Skins — esquema inicial
-- Preparado para uso futuro. Nesta etapa o frontend usa dados demonstrativos.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.wear_code as enum ('FN', 'MW', 'FT', 'WW', 'BS');
create type public.variant_type as enum ('normal', 'stattrak', 'souvenir');
create type public.order_status as enum ('pending', 'confirmed', 'delivered', 'cancelled');
create type public.admin_role as enum ('owner', 'admin', 'editor');

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Usuários administrativos (vinculados ao Supabase Auth)
-- -----------------------------------------------------------------------------
create table public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        public.admin_role not null default 'editor',
  display_name text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Categorias / raridades / condições
-- -----------------------------------------------------------------------------
create table public.categories (
  id          text primary key,                -- 'rifle', 'sniper', ...
  label       text not null,
  badge       text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.rarities (
  id          text primary key,                -- 'covert', 'classified', ...
  name        text not null,
  label       text not null,
  color       text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order  int  not null default 0
);

create table public.conditions (
  code        public.wear_code primary key,
  name        text not null,
  label       text not null,
  min_float   numeric(8,6) not null,
  max_float   numeric(8,6) not null,
  check (min_float >= 0 and max_float <= 1 and min_float < max_float)
);

-- -----------------------------------------------------------------------------
-- Produtos e variações
-- -----------------------------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  weapon            text not null,
  finish            text not null,
  is_star           boolean not null default false,
  category_id       text not null references public.categories (id),
  rarity_id         text not null references public.rarities (id),
  image_url         text not null,
  colors            text[] not null default '{}',
  default_wear      public.wear_code not null default 'FN',
  delivery_estimate text not null default '~1h',
  featured_rank     int,
  market_hash_base  text,                       -- base para integrações de preço futuras
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_idx on public.products (category_id) where active;
create index products_featured_idx on public.products (featured_rank) where active;

-- Combinação vendável: produto + condição + versão (Normal / StatTrak / Souvenir)
create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  wear        public.wear_code not null references public.conditions (code),
  variant     public.variant_type not null default 'normal',
  float_value numeric(8,6) check (float_value is null or (float_value >= 0 and float_value <= 1)),
  stock       int not null default 1 check (stock >= 0),
  available   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, wear, variant)
);

-- Histórico de preços (o preço vigente é o registro mais recente por variação)
create table public.prices (
  id           uuid primary key default gen_random_uuid(),
  variant_id   uuid not null references public.product_variants (id) on delete cascade,
  price        numeric(12,2) not null check (price >= 0),
  steam_price  numeric(12,2) check (steam_price is null or steam_price >= 0),
  currency     char(3) not null default 'BRL',
  source       text not null default 'manual',   -- 'manual' | id do provedor externo
  valid_from   timestamptz not null default now(),
  created_by   uuid references auth.users (id)
);
create index prices_variant_idx on public.prices (variant_id, valid_from desc);

create or replace view public.current_prices
with (security_invoker = true) as
select distinct on (variant_id) variant_id, price, steam_price, currency, source, valid_from
from public.prices
order by variant_id, valid_from desc;

-- -----------------------------------------------------------------------------
-- Kits
-- -----------------------------------------------------------------------------
create table public.kits (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  tag         text,
  price       numeric(12,2) not null check (price >= 0),
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.kit_items (
  kit_id      uuid not null references public.kits (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete restrict,
  quantity    int not null default 1 check (quantity > 0),
  primary key (kit_id, variant_id)
);

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  customer_name  text not null check (char_length(customer_name) between 2 and 80),
  trade_link     text check (trade_link is null or trade_link ~ '^https://steamcommunity\.com/tradeoffer/new/\?partner=\d+&token=[A-Za-z0-9_-]+$'),
  notes          text check (notes is null or char_length(notes) <= 400),
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  discount       numeric(12,2) not null default 0 check (discount >= 0),
  total          numeric(12,2) not null check (total >= 0),
  status         public.order_status not null default 'pending',
  channel        text not null default 'whatsapp',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete set null,
  kit_id      uuid references public.kits (id) on delete set null,
  name        text not null,                    -- snapshot do nome no momento do pedido
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  quantity    int not null check (quantity between 1 and 99),
  check ((variant_id is not null) <> (kit_id is not null) or (variant_id is null and kit_id is null))
);
create index order_items_order_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- Configurações (chave/valor). Apenas chaves públicas são legíveis por anônimos.
-- -----------------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

-- Triggers updated_at
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger kits_updated_at before update on public.kits for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings for each row execute function public.set_updated_at();
