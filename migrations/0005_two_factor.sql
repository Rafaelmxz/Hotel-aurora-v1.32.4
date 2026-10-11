-- Better Auth two-factor plugin (TOTP). CamelCase quoted like 0001_auth.sql.
-- twoFactorEnabled stays false until the user verifies the first authenticator code.
alter table "user"
  add column if not exists "twoFactorEnabled" boolean not null default false;

create table if not exists "twoFactor" (
  "id" text not null primary key,
  "secret" text not null,
  "backupCodes" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "verified" boolean not null default false,
  "failedVerificationCount" integer not null default 0,
  "lockedUntil" timestamptz
);

create index if not exists "twoFactor_userId_idx" on "twoFactor" ("userId");
create index if not exists "twoFactor_secret_idx" on "twoFactor" ("secret");
