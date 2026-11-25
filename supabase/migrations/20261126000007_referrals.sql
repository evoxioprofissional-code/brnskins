-- =============================================================================
-- BRN Skins — Indicações de influenciadores
-- Cada influenciador tem um link próprio (/r/<code>). Visitas e comissões são
-- gravadas pelo servidor do site (service_role); o painel lê e altera via
-- servidor após validar a sessão do admin. Nenhum acesso para anon.
-- =============================================================================

create type public.referral_status as enum ('pending', 'approved', 'paid', 'canceled');
create type public.referral_source as enum ('order', 'upgrade');

create table public.influencers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 2 and 80),
  code             text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,29}$'),
  commission_rate  numeric(5,2) not null default 10 check (commission_rate between 0 and 100),
  active           boolean not null default true,
  contact          text check (contact is null or char_length(contact) <= 120),
  pix_key          text check (pix_key is null or char_length(pix_key) <= 140),
  notes            text check (notes is null or char_length(notes) <= 400),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger influencers_updated_at before update on public.influencers
  for each row execute function public.set_updated_at();

-- Uma linha por visita pelo link (sem IP; visitor_id é um id aleatório em cookie)
create table public.referral_visits (
  id             bigint generated always as identity primary key,
  influencer_id  uuid not null references public.influencers (id) on delete cascade,
  visitor_id     uuid not null,
  landed_at      timestamptz not null default now()
);
create index referral_visits_influencer_idx on public.referral_visits (influencer_id, landed_at desc);
create index referral_visits_visitor_idx on public.referral_visits (influencer_id, visitor_id);

-- Pedido/upgrade de um visitante indicado. A taxa é copiada no momento da venda:
-- mudar a comissão do influenciador vale só para as próximas.
create table public.referral_conversions (
  id               uuid primary key default gen_random_uuid(),
  influencer_id    uuid not null references public.influencers (id) on delete restrict,
  visitor_id       uuid,
  source           public.referral_source not null,
  reference        text not null check (reference ~ '^[A-Za-z0-9_-]{3,60}$'),
  amount           numeric(12,2) not null check (amount >= 0 and amount <= 10000000),
  commission_rate  numeric(5,2) not null check (commission_rate between 0 and 100),
  commission       numeric(12,2) not null check (commission >= 0),
  status           public.referral_status not null default 'pending',
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  paid_at          timestamptz,
  unique (influencer_id, source, reference)
);
create index referral_conversions_influencer_idx on public.referral_conversions (influencer_id, created_at desc);
create index referral_conversions_status_idx on public.referral_conversions (status);

alter table public.influencers          enable row level security;
alter table public.referral_visits      enable row level security;
alter table public.referral_conversions enable row level security;

create policy influencers_admin_all on public.influencers
  for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));
create policy referral_visits_admin_read on public.referral_visits
  for select to authenticated using (public.is_admin('admin'));
create policy referral_conversions_admin_all on public.referral_conversions
  for all to authenticated using (public.is_admin('admin')) with check (public.is_admin('admin'));

-- Indicadores por influenciador a partir de uma data (null = desde sempre)
create or replace function public.influencer_stats(p_since timestamptz default null)
returns table (
  influencer_id     uuid,
  visitors          bigint,
  visits            bigint,
  conversions       bigint,
  revenue           numeric,
  commission_pending  numeric,
  commission_approved numeric,
  commission_paid     numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    i.id,
    coalesce(v.visitors, 0),
    coalesce(v.visits, 0),
    coalesce(c.conversions, 0),
    coalesce(c.revenue, 0),
    coalesce(c.pending, 0),
    coalesce(c.approved, 0),
    coalesce(c.paid, 0)
  from public.influencers i
  left join (
    select influencer_id, count(distinct visitor_id) as visitors, count(*) as visits
    from public.referral_visits
    where p_since is null or landed_at >= p_since
    group by influencer_id
  ) v on v.influencer_id = i.id
  left join (
    select influencer_id,
           count(*) filter (where status <> 'canceled') as conversions,
           sum(amount) filter (where status <> 'canceled') as revenue,
           sum(commission) filter (where status = 'pending') as pending,
           sum(commission) filter (where status = 'approved') as approved,
           sum(commission) filter (where status = 'paid') as paid
    from public.referral_conversions
    where p_since is null or created_at >= p_since
    group by influencer_id
  ) c on c.influencer_id = i.id;
$$;

revoke all on function public.influencer_stats(timestamptz) from public, anon;
grant execute on function public.influencer_stats(timestamptz) to authenticated, service_role;

grant all on public.influencers, public.referral_visits, public.referral_conversions to service_role;
grant select, insert, update, delete on public.influencers, public.referral_conversions to authenticated;
grant select on public.referral_visits to authenticated;
revoke all on public.influencers, public.referral_visits, public.referral_conversions from anon;
