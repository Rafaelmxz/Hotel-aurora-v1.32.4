-- Fase 3: equipe autenticada no hotel compartilhado + pré-reservas públicas.
-- hotel_vault continua um documento por propriedade; o acesso do staff passa por membership.
create table if not exists hotel_member (
  user_id text not null,
  hotel_id text not null,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, hotel_id)
);
create index if not exists hotel_member_hotel_id_idx on hotel_member (hotel_id);

-- Pedidos do site público (sem conta). A recepção absorve no cofre.
create table if not exists hotel_public_pending (
  id text primary key,
  hotel_id text not null,
  payload text not null,
  created_at timestamptz not null default now()
);
create index if not exists hotel_public_pending_hotel_id_idx on hotel_public_pending (hotel_id);
