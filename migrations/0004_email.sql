-- Caixa de saída dos vouchers. Cópia do hotel; entrega externa se houver chave.
create table if not exists hotel_email_outbox (
  id text primary key,
  hotel_id text not null,
  reservation_id text not null,
  to_email text not null,
  subject text not null,
  html text not null,
  text_body text not null,
  delivered boolean not null default false,
  channel text not null,
  created_at timestamptz not null default now()
);
create index if not exists hotel_email_outbox_hotel_idx
  on hotel_email_outbox (hotel_id, created_at desc);
