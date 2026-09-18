export class EmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailError";
  }
}

const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email || email.length > 160) return false;
  if (email.includes("..")) return false;
  if (email.startsWith(".") || email.endsWith(".")) return false;
  return EMAIL_RE.test(email);
}

export function assertValidEmail(value: string) {
  const email = normalizeEmail(value);
  if (!isValidEmail(email)) {
    throw new EmailError("Informe um e-mail válido, no formato nome@dominio.com.");
  }
  return email;
}
