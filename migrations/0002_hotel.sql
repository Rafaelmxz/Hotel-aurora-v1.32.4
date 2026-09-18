-- Cofre do Hotel Aurora: um documento por propriedade (sem contas de usuário nesta fase).
create table if not exists hotel_vault (
  id text primary key,
  payload text not null,
  updated_at timestamptz not null default now()
);
