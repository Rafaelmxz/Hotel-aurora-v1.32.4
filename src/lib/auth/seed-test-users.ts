/**
 * Semente PGLite Better Auth (arranque do banco, não nas rotas).
 * Bruno nasce com senha recepcao1; Ana com senha 1234.
 * Ambos com emailVerified e hash do Better Auth; entra direto, sem reset.
 * Limpa token de reset, 2FA e sessão expirada dessas contas.
 * Só PGLite. Proibido: Neon, ouro, PIN, visual, bypass nas rotas /api/auth.
 */
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { dbSource, getSql } from "@/lib/db";
import { VAULT_ID } from "@/lib/hotel/types";
import { TEST_STAFF_LOGINS } from "./test-credentials";

export async function seedTestAuthUsers() {
  if (dbSource !== "pglite") return;
  const sql = await getSql();

  for (const row of TEST_STAFF_LOGINS) {
    const passwordHash = await hashPassword(row.password);
    const hashOk = await verifyPassword({
      hash: passwordHash,
      password: row.password,
    });
    if (!hashOk) {
      throw new Error(`Semente Better Auth: o hash da senha de ${row.email} não confere.`);
    }

    const existing = await sql<{ id: string }>`
      select id from "user" where email = ${row.email} limit 1
    `;
    const userId = existing[0]?.id ?? randomUUID();
    if (!existing[0]) {
      await sql`
        insert into "user" (
          "id", "name", "email", "emailVerified", "createdAt", "updatedAt", "twoFactorEnabled"
        ) values (
          ${userId}, ${row.name}, ${row.email}, ${true}, now(), now(), ${false}
        )
      `;
    } else {
      await sql`
        update "user"
        set
          "name" = ${row.name},
          "emailVerified" = ${true},
          "twoFactorEnabled" = ${false},
          "updatedAt" = now()
        where id = ${userId}
      `;
    }

    await sql`delete from "twoFactor" where "userId" = ${userId}`;
    await sql`
      delete from "verification"
      where "value" = ${userId}
         or identifier = ${row.email}
    `;
    await sql`
      delete from "session"
      where "userId" = ${userId} and "expiresAt" < now()
    `;

    const account = await sql<{ id: string; password: string | null }>`
      select id, password from "account"
      where "userId" = ${userId} and "providerId" = 'credential'
      limit 1
    `;
    if (account[0]) {
      await sql`
        update "account"
        set password = ${passwordHash}, "updatedAt" = now()
        where id = ${account[0].id}
      `;
    } else {
      const accountId = randomUUID();
      await sql`
        insert into "account" (
          "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
        ) values (
          ${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash},
          now(), now()
        )
      `;
    }

    const stored = await sql<{ password: string | null; emailVerified: boolean }>`
      select a.password, u."emailVerified"
      from "account" a
      join "user" u on u.id = a."userId"
      where a."userId" = ${userId} and a."providerId" = 'credential'
      limit 1
    `;
    const rowStored = stored[0];
    if (!rowStored?.emailVerified) {
      throw new Error(`Semente Better Auth: ${row.email} ficou sem emailVerified.`);
    }
    if (
      !rowStored.password ||
      !(await verifyPassword({ hash: rowStored.password, password: row.password }))
    ) {
      throw new Error(`Semente Better Auth: hash inválido para ${row.email}.`);
    }

    await sql`
      insert into hotel_member (user_id, hotel_id, role)
      values (${userId}, ${VAULT_ID}, ${row.role})
      on conflict (user_id, hotel_id) do update set role = excluded.role
    `;
  }
}
