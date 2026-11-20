create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  vega_checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant update on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "active products public" on public.products for select to anon, authenticated using (active = true);
create policy "admins read all products" on public.products for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

insert into public.products (slug, name, price_cents, stock) values
  ('scooter-500w', 'Scooter Elétrica 500 W', 399000, 10),
  ('cappuccino', 'Cappuccino', 799000, 10),
  ('foston-gt6x', 'Foston GT6X', 999000, 10);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  public_token text not null,
  status text not null check (status in ('aguardando_pagamento','pago','recusado','expirado','estornado','aguardando_entrega','aguardando_retirada','entregue','cancelado')),
  payment_method text not null check (payment_method in ('pix','cartao_vega','pagar_na_entrega','pagar_na_loja')),
  cod_method text,
  product_slug text not null,
  product_name text not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  subtotal_cents integer not null,
  freight_cents integer not null default 0,
  freight_mode text,
  discount_cents integer not null default 0,
  total_cents integer not null,
  customer_name text not null,
  customer_cpf text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('full','pickup')),
  cep text, street text, number text, complement text, district text, city text, uf text,
  distance_km integer,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text, src text,
  vega_transaction_token text,
  vega_status text,
  pix_copy_paste text,
  stock_reserved boolean not null default false,
  paid_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_vega_token_idx on public.orders (vega_transaction_token);
create index orders_created_idx on public.orders (created_at desc);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admins read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  whatsapp_number text not null default '',
  free_shipping_radius_km numeric not null default 100,
  road_factor numeric not null default 1.2,
  pay_on_delivery_max_km numeric not null default 100,
  extra_km_price_cents integer,
  delivery_estimate_text text not null default 'em até 2 dias úteis',
  pix_enabled boolean not null default true,
  card_enabled boolean not null default false,
  cod_enabled boolean not null default true,
  cod_methods text[] not null default array['Dinheiro','Pix','Cartão (maquininha)'],
  site_url text not null default '',
  vega_base_url text not null default '',
  vega_domain text not null default '',
  updated_at timestamptz not null default now()
);
grant select, update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "admins read settings" on public.store_settings for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update settings" on public.store_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.store_settings (id) values (1);

create table public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
grant all on public.app_secrets to service_role;
alter table public.app_secrets enable row level security;

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  payload jsonb not null,
  result text not null,
  order_number text,
  created_at timestamptz not null default now()
);
grant select on public.webhook_events to authenticated;
grant all on public.webhook_events to service_role;
alter table public.webhook_events enable row level security;
create policy "admins read webhook events" on public.webhook_events for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
grant all on public.rate_limits to service_role;
alter table public.rate_limits enable row level security;

create or replace function public.adjust_stock(_slug text, _delta integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update public.products set stock = stock + _delta where slug = _slug and stock + _delta >= 0 returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public.adjust_stock(text, integer) from public, anon, authenticated;
grant execute on function public.adjust_stock(text, integer) to service_role;

create or replace function public.hit_rate_limit(_key text, _max integer, _window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare c integer;
begin
  insert into public.rate_limits as r (key, window_start, count) values (_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => _window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => _window_seconds) then now() else r.window_start end
  returning count into c;
  return c > _max;
end $$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;