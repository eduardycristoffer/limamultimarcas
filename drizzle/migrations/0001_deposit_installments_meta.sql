alter table public.store_settings
  add column deposit_cents integer not null default 30000,
  add column installments_max integer not null default 18 check (installments_max between 1 and 24),
  add column installment_rates jsonb not null default '{"1":0,"2":2.19,"3":3.29,"4":4.38,"5":5.48,"6":6.57,"7":7.67,"8":8.76,"9":9.86,"10":10.95,"11":12.05,"12":13.14,"13":14.24,"14":15.33,"15":16.43,"16":17.52,"17":18.62,"18":19.71}'::jsonb,
  add column meta_pixel_id text not null default '',
  add column meta_test_event_code text not null default '';

alter table public.orders
  add column deposit_cents integer not null default 0,
  add column deposit_paid_at timestamptz,
  add column balance_cents integer not null default 0,
  add column tracking_consent boolean not null default false,
  add column meta_event_id text,
  add column fbp text,
  add column fbc text,
  add column client_ip text,
  add column client_user_agent text,
  add column capi_purchase_sent_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('aguardando_sinal','aguardando_pagamento','pago','recusado','expirado','estornado','aguardando_entrega','aguardando_retirada','entregue','cancelado'));