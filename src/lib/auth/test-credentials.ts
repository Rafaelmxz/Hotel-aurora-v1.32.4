/**
 * Contas de teste da equipe (PGLite local).
 * Ana entra com senha 1234 já confirmada; Bruno com recepcao1.
 * Senha já no hash Better Auth: entrar direto, sem ecrã de redefinição.
 * Proibido: usar em Neon/produção; MFA; ouro.
 * PIN da Ana fica na Equipe (userStore), não aqui.
 * Cliente e semente do servidor leem daqui.
 * minPasswordLength do Better Auth precisa aceitar 4 caracteres (senha da Ana).
 */
export const TEST_STAFF_LOGINS = [
  {
    email: "bruno.lima@hotelaurora.com",
    name: "Bruno Lima",
    role: "recepcionista" as const,
    password: "recepcao1",
  },
  {
    email: "ana.souza@hotelaurora.com",
    name: "Ana Souza",
    role: "admin" as const,
    password: "1234",
  },
] as const;

export const TEST_STAFF_PASSWORD = TEST_STAFF_LOGINS[0].password;
export const TEST_RECEPTION_LOGIN = TEST_STAFF_LOGINS[0];
export const TEST_ADMIN_LOGIN = TEST_STAFF_LOGINS[1];
